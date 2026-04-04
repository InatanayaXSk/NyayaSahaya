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

    # Extract placeholders like (Name), (Date), etc.
    placeholders = list(set(re.findall(r'\(([A-Za-z0-9\s_]+)\)', content)))
    
    return {
        "id": safe_id,
        "content": content,
        "placeholders": placeholders
    }
