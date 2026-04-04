from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List

from app.database import get_db
from app.models import User, DocumentLedger, document_sharing
from app.api.route_users import get_current_user

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Fetch real-time dashboard statistics for the current user."""
    
    # 1. Total Documents Owned
    stmt_owned = select(func.count(DocumentLedger.id)).where(DocumentLedger.owner_username == current_user.username)
    total_owned = (await db.execute(stmt_owned)).scalar() or 0
    
    # 2. Total Documents Shared WITH me
    stmt_shared = select(func.count(DocumentLedger.id)).join(DocumentLedger.shared_with).where(User.username == current_user.username)
    total_shared = (await db.execute(stmt_shared)).scalar() or 0
    
    # 3. Recent Activity (Last 5 documents across owned/shared)
    stmt_activity = select(DocumentLedger).where(
        (DocumentLedger.owner_username == current_user.username) |
        (DocumentLedger.shared_with.any(User.username == current_user.username))
    ).order_by(desc(DocumentLedger.timestamp)).limit(5)
    
    recent_docs = (await db.execute(stmt_activity)).scalars().all()
    
    recent_activity = []
    for doc in recent_docs:
        recent_activity.append({
            "case_ref": doc.public_id[:12].upper(),
            "status": "Processed" if doc.signature_data else "Draft",
            "last_update": doc.timestamp.strftime("%Y-%m-%d %H:%M"),
            "assigned_to": doc.owner_username
        })

    return {
        "active_cases": total_owned + total_shared,
        "active_cases_trend": "+2%", # Mock trend for now
        "docs_processed": total_owned,
        "docs_trend": "+5%",
        "critical_risks": 0,
        "risks_trend": "0%",
        "pending_reviews": total_shared,
        "reviews_trend": "-1%",
        "recent_activity": recent_activity
    }
