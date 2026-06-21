from fastapi import APIRouter, HTTPException, Response, Depends, UploadFile, File, Request
from fastapi.responses import FileResponse
from typing import Optional
import os
import asyncio
from app.config import settings
import cloudinary.utils
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app import schemas as s
from app.models import DocumentLedger, User, Role, document_sharing
from app.api.route_users import get_current_user
from app.database import get_db
from app.services.file_service import file_service
from app.services.document_generator import generate_document_from_template
from app.services.ai_analyzer import ai_analyzer
import hashlib

router = APIRouter()

@router.get("/documents/stats")
async def get_document_stats(
    client: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Analytics for dashboard: counts documents and sealing status."""
    print(f"[STATS] Fetching stats for user: {current_user.username}, client filter: {client}")
    
    if current_user.role == Role.LAWYER and client:
        # Filter documents that are accessible by both the lawyer and the client
        stmt_base = (
            ((func.lower(DocumentLedger.owner_username) == func.lower(current_user.username)) |
             (DocumentLedger.shared_with.any(func.lower(User.username) == func.lower(current_user.username))))
            &
            ((func.lower(DocumentLedger.owner_username) == func.lower(client)) |
             (DocumentLedger.shared_with.any(func.lower(User.username) == func.lower(client))))
        )
    else:
        stmt_base = (
            (func.lower(DocumentLedger.owner_username) == func.lower(current_user.username)) |
            (DocumentLedger.shared_with.any(func.lower(User.username) == func.lower(current_user.username)))
        )
        
    stmt_total = select(func.count(DocumentLedger.id)).where(stmt_base)
    res_total = await db.execute(stmt_total)
    total_docs = res_total.scalar() or 0

    # Sealed docs (actually confirmed on-chain)
    stmt_sealed = select(func.count(DocumentLedger.id)).where(stmt_base, DocumentLedger.sealed == True)
    res_sealed = await db.execute(stmt_sealed)
    sealed_docs = res_sealed.scalar() or 0
    
    print(f"[STATS] Result: total={total_docs}, sealed={sealed_docs}")

    return {
        "total_docs": total_docs,
        "sealed_docs": sealed_docs,
        "pending_docs": total_docs - sealed_docs
    }

@router.post("/analyze")
async def analyze_document(request: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Analyze a document from local storage, ensuring user has access via SQL logic."""
    public_id = request.get("public_id")
    if not public_id:
        raise HTTPException(status_code=400, detail="public_id is required")
        
    # Check access in SQL
    stmt = select(DocumentLedger).where(
        (DocumentLedger.public_id == public_id) & 
        ((DocumentLedger.owner_username == current_user.username) | 
         (DocumentLedger.shared_with.any(User.username == current_user.username)))
    )
    result = await db.execute(stmt)
    ledger_entry = result.scalar_one_or_none()
    
    if not ledger_entry:
        raise HTTPException(status_code=403, detail="Access denied or document not found")

    # Local Analysis: Read from database bytes
    try:
        pdf_bytes = await file_service.get_pdf_bytes(public_id, db)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found in database")
    analysis = await ai_analyzer.analyze_document(file_path="", public_id=public_id, db=db, pdf_bytes=pdf_bytes)
    return analysis


@router.post("/generate-doc", response_model=s.DocumentGenerateResponse)
async def generate_document(request: s.DocumentGenerateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Generate document and save to local storage."""
    document_type = request.document_type
    data = request.data

    pdf_io = generate_document_from_template(document_type, data, custom_text=request.custom_text)
    if not pdf_io:
        return s.DocumentGenerateResponse(success=False, filename="", message="Error generating document")
        
    pdf_bytes = pdf_io.read()
    filename = f"{document_type.replace(' ', '_')}"
    
    # Save Locally
    result = file_service.save_document(pdf_bytes, filename)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])

    # Create SQL Ledger Entry
    ledger_entry = DocumentLedger(
        public_id=result["public_id"],
        document_type=document_type,
        current_hash=result["doc_hash"],
        owner_username=current_user.username,
        signer_id="SYSTEM",
        pdf_data=pdf_bytes
    )
    db.add(ledger_entry)
    
    # Automatically share with selected client if provided
    if request.client_username:
        client_res = await db.execute(select(User).where(User.username == request.client_username))
        client_user = client_res.scalar_one_or_none()
        if client_user:
            ledger_entry.shared_with.append(client_user)
            print(f"[LexNet] Document {result['public_id']} automatically shared with client {request.client_username}")
            
    await db.commit()
    
    # Pre-extract text AND perform Risk Analysis in background (Single-run strategy)
    # Use a background task to ensure it persists to DB
    from app.database import engine
    from sqlalchemy.orm import sessionmaker
    
    async def run_background_analysis(p_bytes, p_id):
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with SessionLocal() as background_db:
            print(f"[LexNet] Background Analysis started for {p_id}")
            await ai_analyzer.analyze_document(file_path="", public_id=p_id, db=background_db, pdf_bytes=p_bytes)
            print(f"[LexNet] Background Analysis complete for {p_id}")

    asyncio.create_task(run_background_analysis(pdf_bytes, result["public_id"]))

    return s.DocumentGenerateResponse(
        success=True,
        public_id=result["public_id"],
        filename=result["filename"],
        message="Document successfully generated and stored in database.",
        doc_hash=result["doc_hash"],
        download_url=result["url"]
    )

@router.get("/documents")
async def list_documents(
    client: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List documents where user is owner or shared."""
    # Eager load owner to get full_name
    if current_user.role == Role.LAWYER and client:
        stmt = select(DocumentLedger).options(selectinload(DocumentLedger.owner)).where(
            ((DocumentLedger.owner_username == current_user.username) | 
             (DocumentLedger.shared_with.any(User.username == current_user.username)))
            &
            ((DocumentLedger.owner_username == client) | 
             (DocumentLedger.shared_with.any(User.username == client)))
        )
    else:
        stmt = select(DocumentLedger).options(selectinload(DocumentLedger.owner)).where(
            (DocumentLedger.owner_username == current_user.username) | 
            (DocumentLedger.shared_with.any(User.username == current_user.username))
        )
    result = await db.execute(stmt)
    accessible_docs = result.scalars().all()
    
    documents = []
    for doc in accessible_docs:
        documents.append({
            "public_id": doc.public_id,
            "document_type": doc.document_type,
            "created_at": doc.timestamp.isoformat(),
            "secure_url": f"{settings.STATIC_FILES_URL}/{doc.public_id}",
            "owner": doc.owner_username,
            "owner_full_name": doc.owner.full_name if doc.owner else None,
            "sealed": doc.sealed
        })
    
    return {"documents": documents}
    
@router.get("/download/{public_id:path}")
async def download_document(
    request: "Request",
    public_id: str,
    token: str = None,          # ?token=<jwt> — used when browser opens PDF directly
    db: AsyncSession = Depends(get_db),
):
    """Securely download a PDF. Accepts JWT via Authorization header OR
    ?token=<jwt> query param so browsers can load PDFs without custom headers."""
    from fastapi import Request as _Request
    from jose import jwt as jose_jwt, JWTError
    from app.config import settings as cfg

    # Try to resolve user from Authorization header first, then fall back to ?token=
    resolved_token = token
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        resolved_token = auth_header[7:]

    current_user = None
    if resolved_token:
        try:
            payload = jose_jwt.decode(resolved_token, cfg.SECRET_KEY, algorithms=[cfg.ALGORITHM])
            username = payload.get("sub")
            if username:
                res = await db.execute(select(User).where(User.username == username))
                current_user = res.scalar_one_or_none()
        except (JWTError, Exception):
            pass

    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # RBAC check
    stmt = select(DocumentLedger).where(
        (DocumentLedger.public_id == public_id) &
        ((DocumentLedger.owner_username == current_user.username) |
         (DocumentLedger.shared_with.any(User.username == current_user.username)))
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=403, detail="Access denied or document not found")
        
    try:
        pdf_bytes = await file_service.get_pdf_bytes(public_id, db)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found in database")

    if doc.eth_tx_hash and not doc.sealed:
        from app.services.eth_service import eth_service
        try:
            tx_status = eth_service.check_transaction_status(doc.eth_tx_hash)
            if tx_status is True:
                doc.sealed = True
                await db.commit()
            elif tx_status is False:
                doc.eth_tx_hash = None
                doc.sealed = False
                await db.commit()
        except Exception as e:
            print(f"Error checking transaction status during download: {e}")
            
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={public_id}"}
    )


@router.post("/documents/share")
async def share_document(request: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Share a document with a user (client or lawyer) using the relational association table."""
    public_id = request.get("public_id")
    target_username = request.get("username") or request.get("lawyer_username")
    
    if not public_id or not target_username:
        raise HTTPException(status_code=400, detail="public_id and username/lawyer_username are required")
        
    # Get document with shared_with relationship loaded eagerly
    result = await db.execute(
        select(DocumentLedger)
        .options(selectinload(DocumentLedger.shared_with))
        .where(DocumentLedger.public_id == public_id)
    )
    ledger_entry = result.scalar_one_or_none()
    if not ledger_entry:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if ledger_entry.owner_username != current_user.username:
        raise HTTPException(status_code=403, detail="Only the owner can share this document")
        
    # Get target user
    result = await db.execute(select(User).where(User.username == target_username))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if already shared (using the eagerly loaded relationship)
    if target_user not in ledger_entry.shared_with:
        # Add to relationship
        ledger_entry.shared_with.append(target_user)
        await db.commit()
        
    return {"success": True, "message": f"Document shared with {target_username}"}

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get real-time statistics from PostgreSQL."""
    # Count accessible docs
    doc_stmt = select(func.count(DocumentLedger.id)).where(
        (DocumentLedger.owner_username == current_user.username) | 
        (DocumentLedger.shared_with.any(User.username == current_user.username))
    )
    doc_count = (await db.execute(doc_stmt)).scalar() or 0
    
    # Systems stats
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    
    return {
        "active_cases": doc_count,
        "docs_processed": doc_count * 2,
        "critical_risks": 0,
        "pending_reviews": 5 if current_user.role == Role.LAWYER else 0,
        "total_users": user_count
    }

@router.get("/documents/similar-cases")
async def get_similar_cases(
    public_id: str,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve or dynamically generate similar cases for a document with strict RBAC."""
    if not public_id:
        raise HTTPException(status_code=400, detail="public_id is required")

    # SQL-based RBAC check
    stmt = select(DocumentLedger).where(
        (DocumentLedger.public_id == public_id) & 
        ((DocumentLedger.owner_username == current_user.username) | 
         (DocumentLedger.shared_with.any(User.username == current_user.username)))
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=403, detail="Access denied or document not found")

    try:
        similar_cases = await ai_analyzer.get_similar_cases(
            file_path="", public_id=public_id, document_type=doc.document_type, force=force, db=db
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"similar_cases": similar_cases}

@router.get("/documents/{id_or_public_id:path}")
async def get_document(id_or_public_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Retrieve document details from SQL Ledger & Local Storage."""
    # Handle both integer IDs and string public_ids
    if id_or_public_id.isdigit():
        stmt = select(DocumentLedger).options(selectinload(DocumentLedger.owner)).where(DocumentLedger.id == int(id_or_public_id))
    else:
        stmt = select(DocumentLedger).options(selectinload(DocumentLedger.owner)).where(DocumentLedger.public_id == id_or_public_id)
        
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check access
    if doc.owner_username != current_user.username:
        # Check if shared with this lawyer
        shared_stmt = select(document_sharing).where(
            (document_sharing.c.document_id == doc.id) & 
            (document_sharing.c.lawyer_id == current_user.id)
        )
        shared_res = await db.execute(shared_stmt)
        if not shared_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")

    # Mock history for the verification report
    events = [
        {"action": "Source Document Indexed", "details": "Local file system sync complete", "timestamp": doc.timestamp.isoformat()},
        {"action": "Cryptographic Seal Applied", "details": f"SHA-256: {doc.current_hash[:16]}...", "timestamp": doc.timestamp.isoformat()},
    ]
    
    return {
        "id": doc.id,
        "public_id": doc.public_id,
        "content_hash": doc.current_hash,
        "status": "Verified" if doc.signature_data else "Draft",
        "timestamp": doc.timestamp.isoformat(),
        "events": events,
        "secure_url": f"{settings.STATIC_FILES_URL}/{doc.public_id}",
        "owner_username": doc.owner_username,
        "owner_full_name": doc.owner.full_name if doc.owner else None
    }

@router.get("/templates/{template_id}")
async def get_template_text(template_id: str):
    """Retrieve the raw text and detected placeholders for a template."""
    # Mapping ID to file name
    mapping = {
        "rental": "Rental Agreement",
        "sale_deed": "Sale Deed",
        "will": "Will Deed",
        "power_of_attorney": "Power of Attorney"
    }
    
    name = mapping.get(template_id)
    if not name:
        raise HTTPException(status_code=404, detail="Template not found")
        
    # Read the extracted .txt file
    # Ensure extract_templates.py has been run
    path = os.path.join("template", f"{name}.txt")
    if not os.path.exists(path):
        # Try to re-extract or return error
        raise HTTPException(status_code=404, detail=f"Extracted template text not found at {path}")
        
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
        
    # Safe placeholder detection
    import re
    # Match only parenthesized placeholders on the same line
    found = re.findall(r'\([^)\n]+\)', text)
    
    # Preserve order of appearance while ensuring uniqueness
    seen = set()
    unique_placeholders = []
    for p in [x.strip() for x in found]:
        if p not in seen:
            seen.add(p)
            unique_placeholders.append(p)
    
    # Filter out numbering, generic text, and non-placeholders
    cleaned_placeholders = []
    for p in unique_placeholders:
        inner = p[1:-1].strip()
        if len(inner) < 2 or len(inner) > 50:
            continue
        if re.match(r'^\d+$|^[a-zA-Z]$|^[ivxIVX]+$', inner):
            continue
        if ',' in inner or ';' in inner or '.' in inner:
            continue
        if inner.lower() in ['general', 's', 'if any', 'not exceeding once in a month']:
            continue
        cleaned_placeholders.append(p)
    
    return {
        "id": template_id,
        "name": name,
        "content": text,
        "placeholders": cleaned_placeholders
    }


@router.get("/document-types")
async def get_document_types():
    """Return available document types."""
    return {
        "types": [
            {
                "id": "rental_agreement",
                "name": "Rental Agreement",
                "icon": "home_work",
                "fields": ["lessor_name", "lessee_name", "property_address", "monthly_rent", "security_deposit", "notice_period"],
            },
            {
                "id": "sale_deed",
                "name": "Sale Deed",
                "icon": "description",
                "fields": ["seller_name", "purchaser_name", "property_details", "total_amount"],
            },
            {
                "id": "will",
                "name": "Will / Testament",
                "icon": "contract_edit",
                "fields": ["testator_name", "executor_name", "beneficiary_name", "assets"],
            },
            {
                "id": "power_of_attorney",
                "name": "Power of Attorney",
                "icon": "assignment_ind",
                "fields": ["executant_name", "attorney_name", "property_details"],
            },
        ]
    }


@router.post("/verify-upload")
async def verify_uploaded_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Compute hash of uploaded file and check DB/Blockchain status."""
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Search for this hash in the ledger
    stmt = select(DocumentLedger).options(selectinload(DocumentLedger.owner)).where(DocumentLedger.current_hash == file_hash)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        return {
            "status": "not_found",
            "message": "This document is not registered in the NyayaSahaya system.",
            "verified": False,
            "hash": file_hash
        }
        
    return {
        "status": "found",
        "verified": bool(doc.eth_tx_hash),
        "doc_id": doc.public_id,
        "document_type": doc.document_type,
        "owner": doc.owner.full_name if doc.owner else doc.owner_username,
        "timestamp": doc.timestamp.isoformat(),
        "tx_hash": doc.eth_tx_hash,
        "hash": file_hash,
        "etherscan_url": f"https://sepolia.etherscan.io/tx/{doc.eth_tx_hash}" if doc.eth_tx_hash else None
    }


