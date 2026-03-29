import os
import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException, Response
import cloudinary.utils
from app import schemas as s
from app.services.document_generator import generate_document_from_template
from app.services.cloudinary_service import cloudinary_service

router = APIRouter()


@router.post("/generate-doc", response_model=s.DocumentGenerateResponse)
async def generate_document(request: s.DocumentGenerateRequest):
    """Generate a legal document PDF, upload to Cloudinary, and return info."""
    document_type = request.document_type
    data = request.data

    if not document_type:
        return s.DocumentGenerateResponse(success=False, filename="", message="document_type is required")

    pdf_io = generate_document_from_template(document_type, data)
    
    if not pdf_io:
        return s.DocumentGenerateResponse(
            success=False,
            filename="",
            message="Error generating document or template not found"
        )
        
    pdf_bytes = pdf_io.read()
    filename = f"{document_type.replace(' ', '_')}"
    
    # Upload to Cloudinary instead of local DB/Disk
    metadata = {
        "document_type": document_type,
        "generated_at": datetime.now().isoformat(),
        **data
    }
    
    result = cloudinary_service.upload_document(pdf_bytes, filename, metadata)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])

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
async def list_documents():
    """List documents stored in Cloudinary."""
    docs = cloudinary_service.search_documents()
    return {"documents": docs}

@router.get("/documents/{public_id}")
async def get_document(public_id: str):
    """Retrieve document details from Cloudinary."""
    # Cloudinary search/resource API returns results with 'public_id'
    # We replace / with something safe if needed, but FastAPI handles it or we use query params
    doc = cloudinary_service.get_document_details(public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

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
