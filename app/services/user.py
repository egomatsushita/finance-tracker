from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.user import UserRepository
from schemas.user import UserReadSchema, UserCreateHashSchema, UserUpdateSchema, UserUpdateHashSchema, UserCreateSchema
from services.auth import hash_password


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = UserRepository(session)

    async def get_all(self, offset: int = 0, limit: int = 10) -> list[UserReadSchema]:
        users = await self.repo.get_all(offset=offset, limit=limit)
        return [UserReadSchema.model_validate(user) for user in users]

    async def get_by_id(self, user_id: UUID) -> UserReadSchema:
        user = await self.repo.get_by_id(user_id)

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return UserReadSchema.model_validate(user)

    async def get_by_username(self, username: str) -> UserReadSchema:
        user = await self.repo.get_by_username(username)

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return UserReadSchema.model_validate(user)

    async def create(self, user_data: UserCreateSchema) -> UserReadSchema:
        new_user_data = UserCreateHashSchema(
            **user_data.model_dump(exclude={"password"}), hashed_password=hash_password(user_data.password)
        )
        new_user = await self.repo.create(new_user_data)
        return UserReadSchema.model_validate(new_user)

    async def update(self, user_id: UUID, user_data: UserUpdateSchema) -> UserReadSchema:
        if user_data.password is not None:
            data = UserUpdateHashSchema(
                **user_data.model_dump(exclude={"password"}), hashed_password=hash_password(user_data.password)
            )
        else:
            data = UserUpdateHashSchema(**user_data.model_dump())

        updated_user = await self.repo.update(user_id, data)

        if updated_user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return UserReadSchema.model_validate(updated_user)

    async def delete(self, user_id: UUID) -> dict:
        resp = await self.repo.delete(user_id)
        if not resp:
            raise HTTPException(status_code=404, detail="User not found")
        return {"success": True}
