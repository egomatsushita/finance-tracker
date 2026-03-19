from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.user import UserRepository
from sqlalchemy.exc import IntegrityError
from schemas.user import (
    UserReadSchema,
    UserCreateHashSchema,
    UserUpdateSchema,
    UserUpdateHashSchema,
    UserCreateSchema,
)
from schemas.params import FilterParams
from services.auth import AuthService


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = UserRepository(session)

    async def get_all(self, filter_params: FilterParams) -> list[UserReadSchema]:
        """
        Return a paginated list of all users.
        Args:
            filter_params: pagination and ordering options (offset, limit, order_by).
        Returns:
            A list of validated UserReadSchema instances.
        """
        users = await self.repo.get_all(filter_params)
        return [UserReadSchema.model_validate(user) for user in users]

    async def get_by_id(self, user_id: UUID) -> UserReadSchema:
        """
        Return a user by ID.
        Args:
            user_id: the UUID of the user to retrieve.
        Returns:
            The matching user as a UserReadSchema instance.
        Raises:
            HTTPException (404): if no user with the given ID exists.
        """
        user = await self.repo.get_by_id(user_id)

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return UserReadSchema.model_validate(user)

    async def get_by_username(self, username: str) -> UserReadSchema:
        """
        Return a user by username.
        Args:
            username: the username to look up.
        Returns:
            The matching user as a UserReadSchema instance.
        Raises:
            HTTPException (404): if no user with the given username exists.
        """
        user = await self.repo.get_by_username(username)

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return UserReadSchema.model_validate(user)

    async def create(self, user_data: UserCreateSchema) -> UserReadSchema:
        """
        Create a new user, hashing the plain-text password before storage.
        Args:
            user_data: the user's details including plain-text password.
        Returns:
            The created user as a UserReadSchema instance.
        Raises:
            HTTPException (409): if the username or email is already taken.
        """
        new_user_data = UserCreateHashSchema(
            **user_data.model_dump(exclude={"password"}),
            hashed_password=AuthService.create_hashed_password(user_data.password),
        )

        try:
            new_user = await self.repo.create(new_user_data)
        except IntegrityError:
            raise HTTPException(status_code=409, detail="Username or email already exist.")

        return UserReadSchema.model_validate(new_user)

    async def update(self, user_id: UUID, user_data: UserUpdateSchema) -> UserReadSchema:
        """
        Update a user's data by ID. Only fields explicitly set are applied.
        If a new password is provided, it is hashed before storage.
        Args:
            user_id: the UUID of the user to update.
            user_data: partial update payload; unset fields are ignored.
        Returns:
            The updated user as a UserReadSchema instance.
        Raises:
            HTTPException (404): if no user with the given ID exists.
            HTTPException (409): if the new username or email conflicts with an existing user.
        """
        if user_data.password is not None:
            data = UserUpdateHashSchema(
                **user_data.model_dump(exclude={"password"}, exclude_unset=True),
                hashed_password=AuthService.create_hashed_password(user_data.password),
            )
        else:
            data = UserUpdateHashSchema(**user_data.model_dump(exclude_unset=True))

        try:
            updated_user = await self.repo.update(user_id, data)
        except IntegrityError:
            raise HTTPException(status_code=409, detail="Username or email already exist.")

        if updated_user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return UserReadSchema.model_validate(updated_user)

    async def delete(self, user_id: UUID) -> None:
        """
        Delete a user by ID.
        Args:
            user_id: the UUID of the user to delete.
        Raises:
            HTTPException (404): if no user with the given ID exists.
        """
        success = await self.repo.delete(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
