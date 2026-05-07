import asyncio
from app.database import AsyncSessionLocal
from app.models import User
from sqlalchemy import select

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.username, User.role))
        users = result.all()
        for user in users:
            print(f"User: {user.username}, Role: {user.role}")

if __name__ == "__main__":
    asyncio.run(check_users())
