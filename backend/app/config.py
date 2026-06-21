"""Application configuration via environment variables.

The Settings object is a mutable runtime store. Values are seeded from
environment variables at startup, but any key can be patched live via
`settings.update(key, value)` — no server restart required.
This powers the /api/admin/config endpoint.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Keys that are never exposed via the GET /api/admin/config endpoint.
_REDACTED_KEYS = {"SECRET_KEY", "PRIVATE_KEY", "ETH_PRIVATE_KEY"}

# Keys that are safe to read and write via the admin endpoint.
# Extend this list if you add new runtime-configurable settings.
EDITABLE_KEYS = {
    "RPI_BASE_URL",
    "HARDWARE_MODE",
    "OPENROUTER_MODEL",
    "OPENROUTER_API_KEY",
    "ALCHEMY_API_KEY",
    "ENDPOINT_SEPOLIA",
    "ETH_CONTRACT_ADDRESS",
    "TOGETHER_API_KEY",
}


class Settings:
    PROJECT_NAME: str = "LexNet API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # CORS — populated from env; listing explicit origins so credentials work.
    CORS_ORIGINS: list = list(filter(None, [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.getenv("CORS_ORIGIN_VERCEL", ""),   # e.g. https://nyaya-sahaya-fawn.vercel.app
        os.getenv("CORS_ORIGIN_EXTRA", ""),    # any additional prod origin
    ]))

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
    HARDWARE_MODE: str = os.getenv("HARDWARE_MODE", "mock")

    # MongoDB (Deprecated)
    MONGODB_CONN_URL: str = os.getenv("MONGODB_CONN_URL", "")

    # PostgreSQL (Primary)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback_secret_key_please_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Local Storage
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
    STATIC_FILES_URL: str = "/api/files"

    # Ethereum Sepolia
    ALCHEMY_API_KEY: str = os.getenv("ALCHEMY_API_KEY", "")
    ENDPOINT_SEPOLIA: str = os.getenv("ENDPOINT_SEPOLIA", "https://eth-sepolia.g.alchemy.com/v2/")
    ETH_PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")
    ETH_CONTRACT_ADDRESS: str = os.getenv("ETH_CONTRACT_ADDRESS", "")

    # Admin endpoint protection — set SETTINGS_SECRET in your env.
    SETTINGS_SECRET: str = os.getenv("SETTINGS_SECRET", "change_me_in_production")

    @property
    def SEPOLIA_RPC_URL(self) -> str:
        """Build the full Sepolia RPC URL from Alchemy endpoint + API key."""
        return f"{self.ENDPOINT_SEPOLIA}{self.ALCHEMY_API_KEY}"

    def update(self, key: str, value: str) -> None:
        """Patch a setting at runtime (in-memory only, no disk write)."""
        if not hasattr(self, key):
            raise KeyError(f"Unknown setting: {key}")
        if key not in EDITABLE_KEYS:
            raise PermissionError(f"Setting '{key}' is not runtime-editable.")
        setattr(self, key, value)
        # If RPI_BASE_URL changed, also update the hardware provider URL live.
        if key == "RPI_BASE_URL":
            try:
                from app.services.hardware_provider import hardware_provider, RealHardwareProvider
                if isinstance(hardware_provider, RealHardwareProvider):
                    hardware_provider.rpi_url = value
            except Exception:
                pass
        print(f"[Settings] Runtime update: {key} = {value!r}")

    def as_public_dict(self) -> dict:
        """Return all editable settings (secrets redacted)."""
        result = {}
        for key in EDITABLE_KEYS:
            val = getattr(self, key, "")
            result[key] = "••••••••" if key in _REDACTED_KEYS else val
        return result


settings = Settings()
