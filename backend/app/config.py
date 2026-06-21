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
    
    # OpenRouter API (for legal analyzer)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "qwen/qwen3-32b")

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

    # Ethereum Sepolia
    ALCHEMY_API_KEY: str = os.getenv("ALCHEMY_API_KEY", "")
    ENDPOINT_SEPOLIA: str = os.getenv("ENDPOINT_SEPOLIA", "https://eth-sepolia.g.alchemy.com/v2/")
    ETH_PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")
    ETH_CONTRACT_ADDRESS: str = os.getenv("ETH_CONTRACT_ADDRESS", "")

    @property
    def SEPOLIA_RPC_URL(self) -> str:
        """Build the full Sepolia RPC URL from Alchemy endpoint + API key."""
        return f"{self.ENDPOINT_SEPOLIA}{self.ALCHEMY_API_KEY}"


settings = Settings()
