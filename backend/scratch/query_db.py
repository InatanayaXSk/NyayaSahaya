import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User

async def query_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"- ID: {user.id}, Username: {user.username}, Role: {user.role}, Hash: {user.hashed_password}")

if __name__ == "__main__":
    asyncio.run(query_users())
