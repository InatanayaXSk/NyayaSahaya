import os
import asyncio
import httpx
import hashlib
from sqlalchemy import select, func
from app.config import settings
from app.database import AsyncSessionLocal, engine, Base
from app.models import DocumentLedger, User, Role
from app.services.cloudinary_service import cloudinary_service

async def migrate_documents():
    """Migrate documents from Cloudinary to Local Storage and sync PostgreSQL."""
    print("🚀 Starting Cloudinary to Local Migration...")
    
    # 0. Ensure tables exist
    print("🛠️ Verifying database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 1. Fetch documents from Cloudinary
    resources = cloudinary_service.search_documents()
    if not resources:
        print("ℹ️ No documents found in Cloudinary.")
        return

    print(f"📦 Found {len(resources)} documents to migrate.")
    
    if not os.path.exists(settings.STORAGE_DIR):
        os.makedirs(settings.STORAGE_DIR)

    async with AsyncSessionLocal() as db:
        # 1. Ensure a default/system user exists for foreign key constraints
        stmt = select(User).where(User.username == "SYSTEM_MIGRATED")
        system_user = (await db.execute(stmt)).scalar_one_or_none()
        
        if not system_user:
            print("👤 Creating 'SYSTEM_MIGRATED' user...")
            system_user = User(
                username="SYSTEM_MIGRATED",
                hashed_password="!", # Random non-matchable string
                role=Role.CLIENT
            )
            db.add(system_user)
            await db.commit()
            await db.refresh(system_user)

        default_username = "SYSTEM_MIGRATED"

        async with httpx.AsyncClient() as client:
            for res in resources:
                public_id = res.get("public_id")
                url = res.get("secure_url")
                filename = os.path.basename(public_id)
                
                print(f"🔄 Migrating: {public_id}...")
                
                # Check if already migrated (by public_id)
                stmt = select(DocumentLedger).where(DocumentLedger.public_id == public_id)
                existing = (await db.execute(stmt)).scalar_one_or_none()
                if existing:
                    print(f"✅ Already in DB: {public_id}. Skipping metadata sync.")
                
                # Download File
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        file_bytes = response.content
                        doc_hash = hashlib.sha256(file_bytes).hexdigest()
                        
                        # Save to local storage
                        local_path = os.path.join(settings.STORAGE_DIR, filename)
                        with open(local_path, "wb") as f:
                            f.write(file_bytes)
                        
                        if not existing:
                            # Create SQL Ledger Entry
                            context = res.get("context", {}).get("custom", {})
                            owner = context.get("owner", default_username)
                            
                            new_ledger = DocumentLedger(
                                public_id=filename, # Local uses filename as public_id
                                document_type=context.get("document_type", "migrated"),
                                current_hash=doc_hash,
                                owner_username=owner,
                                signer_id="SYSTEM_MIGRATED"
                            )
                            db.add(new_ledger)
                            print(f"📥 Saved {filename} and added to PostgreSQL.")
                    else:
                        print(f"❌ Failed to download {url}: Status {response.status_code}")
                except Exception as e:
                    print(f"❌ Error migrating {public_id}: {e}")

        await db.commit()
    print("🎉 Migration Complete!")

if __name__ == "__main__":
    # Ensure the script can find 'app' by adding CWD to path
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(migrate_documents())
