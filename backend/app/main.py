"""LexNet Unified FastAPI Application."""
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .services.cloudinary_service import cloudinary_service
from . import schemas as s
from .api import route_chat, route_documents, route_hardware, route_crypto, route_ws

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Register API routers
app.include_router(route_chat.router, prefix="/api", tags=["Chat"])
app.include_router(route_documents.router, prefix="/api", tags=["Documents"])
app.include_router(route_hardware.router, prefix="/api", tags=["Hardware"])
app.include_router(route_crypto.router, prefix="/api", tags=["Crypto"])
app.include_router(route_ws.router, tags=["WebSocket"])


@app.on_event("startup")
async def startup():
    """Initialize LexNet Engine on startup."""
    print(f"[LexNet] {settings.PROJECT_NAME} v{settings.VERSION} started.")


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/dashboard/stats")
async def dashboard_stats():
    """Return dashboard statistics from Cloudinary assets."""
    # Fetch resources from Cloudinary
    resources = cloudinary_service.search_documents()
    docs_count = len(resources)
    
    recent_activity = []
    # Take the latest 5
    for res in resources[:5]:
        # Extract metadata from context if available
        context = res.get("context", {}).get("custom", {})
        recent_activity.append({
            "case_ref": res.get("public_id", "Unknown"),
            "status": "Cloud Stored",
            "last_update": res.get("created_at", "-"),
            "assigned_to": context.get("owner_id", "Guest")
        })

    return {
        "active_cases": docs_count,
        "active_cases_trend": "+2%",
        "docs_processed": docs_count,
        "docs_trend": "+5%",
        "critical_risks": 0, 
        "risks_trend": "steady",
        "pending_reviews": 0, 
        "reviews_trend": "steady",
        "recent_activity": recent_activity if recent_activity else [
            {"case_ref": "No Cloud Assets", "status": "-", "last_update": "-", "assigned_to": "-"}
        ],
    }
