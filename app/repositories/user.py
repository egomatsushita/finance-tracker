from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from schemas.user import UserCreateHashSchema, UserUpdateHashSchema


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, offset: int = 0, limit: int = 10) -> list[User]:
        resp = await self.session.execute(select(User).offset(offset).limit(limit))
        users = resp.scalars().all()
        return users

    async def get_by_id(self, user_id: UUID) -> User | None:
        user = await self.session.get(User, user_id)
        return user

    async def get_by_username(self, username: str) -> User | None:
        resp = await self.session.execute(select(User).where(User.username == username))
        user = resp.scalar_one_or_none()
        return user

    async def create(self, user_data: UserCreateHashSchema) -> User:
        user = User(**user_data.model_dump())
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user_id: UUID, user_data: UserUpdateHashSchema) -> User | None:
        user = await self.get_by_id(user_id)

        if user is None:
            return None

        filtered_user_data = user_data.model_dump(exclude_unset=True)
        for name, value in filtered_user_data.items():
            setattr(user, name, value)
        return user

    async def delete(self, user_id: UUID) -> bool:
        user = await self.get_by_id(user_id)

        if user is None:
            return False

        await self.session.delete(user)
        return True
