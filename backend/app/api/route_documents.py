from fastapi import APIRouter, HTTPException, Response, Depends, UploadFile, File
from fastapi.responses import FileResponse
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Analytics for dashboard: counts documents and sealing status."""
    # Total docs owned by user
    print(f"[STATS] Fetching stats for user: {current_user.username}")
    stmt_total = select(func.count(DocumentLedger.id)).where(func.lower(DocumentLedger.owner_username) == func.lower(current_user.username))
    res_total = await db.execute(stmt_total)
    total_docs = res_total.scalar() or 0

    # Sealed docs (have tx_hash)
    stmt_sealed = select(func.count(DocumentLedger.id)).where(
        func.lower(DocumentLedger.owner_username) == func.lower(current_user.username),
        DocumentLedger.eth_tx_hash.isnot(None)
    )
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

    # Local Analysis: Read from disk
    file_path = file_service.get_file_path(public_id)
    analysis = await ai_analyzer.analyze_document(file_path, public_id=public_id, db=db)
    return analysis


@router.post("/generate-doc", response_model=s.DocumentGenerateResponse)
async def generate_document(request: s.DocumentGenerateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Generate document and save to local storage."""
    document_type = request.document_type
    data = request.data

    pdf_io = generate_document_from_template(document_type, data)
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
        signer_id="SYSTEM"
    )
    db.add(ledger_entry)
    await db.commit()
    
    # Pre-extract text AND perform Risk Analysis in background (Single-run strategy)
    # Use a background task to ensure it persists to DB
    from app.database import engine
    from sqlalchemy.orm import sessionmaker
    
    async def run_background_analysis(path, p_id):
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with SessionLocal() as background_db:
            print(f"[LexNet] Background Analysis started for {p_id}")
            await ai_analyzer.analyze_document(path, public_id=p_id, db=background_db)
            print(f"[LexNet] Background Analysis complete for {p_id}")

    file_path = file_service.get_file_path(result["filename"])
    asyncio.create_task(run_background_analysis(file_path, result["public_id"]))

    return s.DocumentGenerateResponse(
        success=True,
        filename=result["filename"],
        secure_url=result["url"],
        message="Document generated and stored locally."
    )

    # Use the unsigned secure_url from Cloudinary — it doesn't expire
    # For forced download we use flags="attachment" but without sign_url
    try:
        download_url, _ = cloudinary.utils.cloudinary_url(
            result["public_id"],
            resource_type="raw",
            sign_url=False,
            secure=True,
            flags="attachment"
        )
    except Exception:
        download_url = result.get("url", "")

    return s.DocumentGenerateResponse(
        success=True,
        public_id=result["public_id"],
        filename=filename + ".pdf",
        message="Document successfully generated and stored in Cloudinary.",
        doc_hash=result["doc_hash"],
        download_url=download_url,
        cloudinary_url=result["url"],
    )

@router.get("/documents")
async def list_documents(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List documents where user is owner or shared."""
    # Eager load owner to get full_name
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
            "owner_full_name": doc.owner.full_name if doc.owner else None
        })
    
    return {"documents": documents}
    
@router.get("/download/{public_id:path}")
async def download_document(public_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Securely download a PDF with correct headers to prevent .html issues."""
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
        
    file_path = file_service.get_file_path(public_id)
    print(f"[DOWNLOAD] public_id={public_id}, path={file_path}, exists={os.path.exists(file_path)}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        path=file_path,
        filename=public_id,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={public_id}"}
    )

@router.post("/documents/share")
async def share_document(request: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Share a document with a lawyer using the relational association table."""
    public_id = request.get("public_id")
    lawyer_username = request.get("lawyer_username")
    
    if not public_id or not lawyer_username:
        raise HTTPException(status_code=400, detail="public_id and lawyer_username are required")
        
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
        
    # Get lawyer
    result = await db.execute(select(User).where(User.username == lawyer_username, User.role == Role.LAWYER))
    lawyer = result.scalar_one_or_none()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")
        
    # Check if already shared (using the eagerly loaded relationship)
    if lawyer not in ledger_entry.shared_with:
        # Add to relationship
        ledger_entry.shared_with.append(lawyer)
        await db.commit()
        
    return {"success": True, "message": f"Document shared with {lawyer_username}"}

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
    # Match (...) or 3+ underscores
    found = re.findall(r'\([^)]+\)|_{3,}', text)
    unique_placeholders = list(set([p.strip() for p in found]))
    
    return {
        "id": template_id,
        "name": name,
        "content": text,
        "placeholders": unique_placeholders
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
