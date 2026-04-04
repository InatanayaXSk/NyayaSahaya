import motor.motor_asyncio
from beanie import init_beanie
from app.config import settings
from app.models import User, DocumentLedger

# MONKEY-PATCH: Beanie 2.1.x tries to call 'client.append_metadata' during init.
# This method was removed in Motor 3.x. We add a dummy no-op to prevent the TypeError.
if not hasattr(motor.motor_asyncio.AsyncIOMotorClient, "append_metadata"):
    motor.motor_asyncio.AsyncIOMotorClient.append_metadata = lambda self, metadata: None

async def init_db():
    """Initialize database connection and ODM models."""
    if not settings.MONGODB_CONN_URL:
        print("[LexNet] WARNING: MONGODB_CONN_URL not set in .env. Skipping DB init.")
        return

    try:
        # Create Motor client
        client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_CONN_URL)
        db = client["nyayasahaya"]
        
        # Initialize Beanie with models
        # Beanie 2.x expects an AsyncIOMotorDatabase instance
        await init_beanie(
            database=db,
            document_models=[User, DocumentLedger]
        )
        print(f"[LexNet] Database connection to 'nyayasahaya' established.")
    except Exception as e:
        print(f"[LexNet] CRITICAL DB ERROR: {type(e).__name__}: {str(e)}")
        raise e
