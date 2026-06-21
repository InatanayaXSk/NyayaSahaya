import os
import re
from fastapi import APIRouter, Depends, HTTPException
from app.config import settings
from app.api.route_users import get_current_user
from app.models import User

router = APIRouter()

@router.get("/templates/{template_id}")
async def get_legal_template(template_id: str, current_user: User = Depends(get_current_user)):
    """Read a legal template from disk and extract placeholders."""
    
    # Security: Ensure template_id doesn't traverse directories
    safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '', template_id)
    template_path = os.path.join(settings.STORAGE_DIR, "..", "template", f"{safe_id}.txt")
    
    if not os.path.exists(template_path):
        # Fallback to a default if rental.txt is missing
        if safe_id == "rental":
            content = "RENTAL AGREEMENT\n\nThis agreement is made on (Date) between (Landlord Name) and (Tenant Name).\n\nThe property is located at (Address).\n\nTerm: (Duration).\n\nRent: (Amount) per month.\n\nSigned,\n(Landlord Signature)\n(Tenant Signature)"
        else:
            raise HTTPException(status_code=404, detail=f"Template {safe_id} not found")
    else:
        with open(template_path, "r", encoding="utf-8") as f:
            content = f.read()

    # Extract placeholders like (Name), (Date), etc. on the same line
    found = re.findall(r'\([^)\n]+\)', content)
    
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
        "id": safe_id,
        "content": content,
        "placeholders": cleaned_placeholders
    }
