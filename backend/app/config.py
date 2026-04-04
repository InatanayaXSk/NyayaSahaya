"""Application configuration via environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "LexNet API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]

    # Together AI (for chatbot)
    TOGETHER_API_KEY: str = os.getenv("TOGETHER_API_KEY", "")

    # FAISS
    FAISS_DB_PATH: str = os.getenv("FAISS_DB_PATH", "../NyayaSahaya-bot/ipc_embed_db")

    # Document templates (points to backend/template)
    REFERENCE_DIR: str = os.getenv("REFERENCE_DIR", "template")

    # Raspberry Pi hardware node
    RPI_BASE_URL: str = os.getenv("RPI_BASE_URL", "http://localhost:8001")

    # MongoDB (Deprecated but kept for now)
    MONGODB_CONN_URL: str = os.getenv("MONGODB_CONN_URL", "")
    
    # PostgreSQL (New Primary)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback_secret_key_please_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Local Storage Configuration
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
    STATIC_FILES_URL: str = "/api/files"


settings = Settings()
