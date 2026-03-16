"""LexNet Unified FastAPI Application."""
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
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
    """Initialize database tables on startup."""
    init_db()
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
    """Return mock dashboard statistics."""
    return {
        "active_cases": 142,
        "active_cases_trend": "+5%",
        "docs_processed": 12450,
        "docs_trend": "+12%",
        "critical_risks": 3,
        "risks_trend": "-2%",
        "pending_reviews": 28,
        "reviews_trend": "-1%",
        "recent_activity": [
            {"case_ref": "LX-2023-0891", "status": "In Review", "last_update": "2 hours ago", "assigned_to": "J. Smith"},
            {"case_ref": "LX-2023-0890", "status": "Flagged", "last_update": "5 hours ago", "assigned_to": "A. Davis"},
            {"case_ref": "LX-2023-0888", "status": "Processed", "last_update": "1 day ago", "assigned_to": "System"},
        ],
    }
