"""LexNet Unified FastAPI Application."""
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .config import settings
from .services.cloudinary_service import cloudinary_service
from . import schemas as s
from .api import route_chat, route_documents, route_hardware, route_crypto, route_ws, route_users, route_dashboard, route_templates
from .database import engine, Base

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

# Mount Local Storage for PDF Retrieval
if not os.path.exists(settings.STORAGE_DIR):
    os.makedirs(settings.STORAGE_DIR)

app.mount(settings.STATIC_FILES_URL, StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Register API routers
app.include_router(route_users.router, prefix="/api/users", tags=["Users"])
app.include_router(route_chat.router, prefix="/api", tags=["Chat"])
app.include_router(route_documents.router, prefix="/api", tags=["Documents"])
app.include_router(route_hardware.router, prefix="/api", tags=["Hardware"])
app.include_router(route_crypto.router, prefix="/api", tags=["Crypto"])
app.include_router(route_ws.router, tags=["WebSocket"])
app.include_router(route_dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(route_templates.router, prefix="/api", tags=["Templates"])


@app.on_event("startup")
async def startup():
    """Initialize SQL Database and LexNet Engine."""
    print(f"[LexNet] Initializing PostgreSQL engine...")
    from sqlalchemy import text
    async with engine.begin() as conn:
        # Create all tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)
        # Add column if not exists
        await conn.execute(text("ALTER TABLE ledger ADD COLUMN IF NOT EXISTS sealed BOOLEAN DEFAULT FALSE"))
    
    print(f"[LexNet] Database tables verified/created.")
    print(f"[LexNet] {settings.PROJECT_NAME} v{settings.VERSION} started.")


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

