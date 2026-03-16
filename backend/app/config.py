"""Application configuration via environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "LexNet API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite:///./lexnet.db"
    )

    # CORS
    CORS_ORIGINS: list = ["*"]

    # Together AI (for chatbot)
    TOGETHER_API_KEY: str = os.getenv("TOGETHER_API_KEY", "")

    # FAISS
    FAISS_DB_PATH: str = os.getenv("FAISS_DB_PATH", "../NyayaSahaya-bot/ipc_embed_db")

    # Document templates
    REFERENCE_DIR: str = os.getenv("REFERENCE_DIR", "../legal_document_generator/reference")

    # Raspberry Pi hardware node
    RPI_BASE_URL: str = os.getenv("RPI_BASE_URL", "http://localhost:8001")


settings = Settings()
