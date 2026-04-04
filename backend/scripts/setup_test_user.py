import os
import asyncio
from sqlalchemy import select, update
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Role, DocumentLedger
from passlib.context import CryptContext

from app.api.route_users import get_password_hash

async def setup_test_users():
    """Create test users and re-assign migrated documents to shogun."""
    print("🚀 Initializing Test Environment...")
    
    # Generate real hash for 'password123'
    static_hash = get_password_hash("password123")
    
    async with AsyncSessionLocal() as db:
        # 1. Create 'shogun' (Client)
        stmt = select(User).where(User.username == "shogun")
        shogun = (await db.execute(stmt)).scalar_one_or_none()
        
        if not shogun:
            print("👤 Creating 'shogun' user...")
            shogun = User(
                username="shogun",
                hashed_password=static_hash,
                role=Role.CLIENT,
                bio="Primary test user for NyayaSahaya."
            )
            db.add(shogun)
        else:
            print("👤 User 'shogun' already exists. Updating password...")
            shogun.hashed_password = static_hash

        # 2. Create 'advocate_smith' (Lawyer)
        stmt = select(User).where(User.username == "advocate_smith")
        smith = (await db.execute(stmt)).scalar_one_or_none()
        
        if not smith:
            print("⚖️ Creating 'advocate_smith' lawyer...")
            smith = User(
                username="advocate_smith",
                hashed_password=static_hash,
                role=Role.LAWYER,
                specialization="Civil & Property Law",
                bio="Experienced advocate with 10+ years in drafting rental agreements."
            )
            db.add(smith)
        else:
            print("⚖️ User 'advocate_smith' already exists. Updating password...")
            smith.hashed_password = static_hash
        
        await db.commit()

        # 3. Re-assign documents from SYSTEM_MIGRATED to shogun
        print("📥 Re-assigning documents to shogun...")
        stmt = update(DocumentLedger).where(
            DocumentLedger.owner_username == "SYSTEM_MIGRATED"
        ).values(owner_username="shogun")
        
        result = await db.execute(stmt)
        await db.commit()
        print(f"✅ Successfully re-assigned {result.rowcount} documents to 'shogun'.")

    print("🎉 Test Environment Ready!")
    print("-------------------------")
    print("Login: shogun / password123 (Client)")
    print("Login: advocate_smith / password123 (Lawyer)")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(setup_test_users())
