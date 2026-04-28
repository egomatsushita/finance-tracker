import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from errors.user import UserAlreadyExistError, UserNotFoundError
from repositories.user import UserRepository
from schemas.params import FilterParams
from schemas.user import (
    UserCreateHashSchema,
    UserCreateSchema,
    UserReadSchema,
    UserUpdateAdminSchema,
    UserUpdateHashSchema,
    UserUpdateSelfSchema,
)
from services.auth import AuthService

logger = logging.getLogger(__name__)


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
            UserNotFoundError: if no user with the given ID exists.
        """
        user = await self.repo.get_by_id(user_id)

        if user is None:
            raise UserNotFoundError()

        return UserReadSchema.model_validate(user)

    async def get_by_username(self, username: str) -> UserReadSchema:
        """
        Return a user by username.
        Args:
            username: the username to look up.
        Returns:
            The matching user as a UserReadSchema instance.
        Raises:
            UserNotFoundError: If no user with the given username exists.
        """
        user = await self.repo.get_by_username(username)

        if user is None:
            raise UserNotFoundError()

        return UserReadSchema.model_validate(user)

    async def create(self, user_data: UserCreateSchema) -> UserReadSchema:
        """
        Create a new user, hashing the plain-text password before storage.
        Args:
            user_data: the user's details including plain-text password.
        Returns:
            The created user as a UserReadSchema instance.
        Raises:
            UserAlreadyExistError: if the username or email is already taken.
        """
        new_user_data = UserCreateHashSchema(
            **user_data.model_dump(exclude={"password"}),
            hashed_password=AuthService.create_hashed_password(user_data.password),
        )

        try:
            new_user = await self.repo.create(new_user_data)
        except IntegrityError:
            raise UserAlreadyExistError()

        logger.info("user_created user_id=%s", new_user.id)
        return UserReadSchema.model_validate(new_user)

    async def update(
        self, user_id: UUID, user_data: UserUpdateSelfSchema | UserUpdateAdminSchema
    ) -> UserReadSchema:
        """
        Update a user's data by ID. Only fields explicitly set are applied.
        If a new password is provided, it is hashed before storage.
        Args:
            user_id: the UUID of the user to update.
            user_data: partial update payload; unset fields are ignored.
        Returns:
            The updated user as a UserReadSchema instance.
        Raises:
            UserNotFoundError: if no user with the given ID exists.
            UserAlreadyExistError: if the new username or email conflicts with an
                                   existing user.
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
            raise UserAlreadyExistError()

        if updated_user is None:
            raise UserNotFoundError()

        # Exclude credential fields — log field names only, never values.
        safe_fields = user_data.model_fields_set - {"password", "hashed_password"}
        logger.info("user_updated user_id=%s fields=%s", user_id, sorted(safe_fields))
        return UserReadSchema.model_validate(updated_user)

    async def delete(self, user_id: UUID) -> None:
        """
        Delete a user by ID.
        Args:
            user_id: the UUID of the user to delete.
        Raises:
            UserNotFoundError: if no user with the given ID exists.
        """
        success = await self.repo.delete(user_id)
        if not success:
            raise UserNotFoundError()
        logger.info("user_deleted user_id=%s", user_id)
