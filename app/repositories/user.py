from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from schemas.params import FilterParams
from schemas.user import UserCreateHashSchema, UserUpdateHashSchema


class UserRepository:
    """
    Repository for all database operations on the `User` model.

    Centralizes all `User` model query logic and exposes it to the service layer.
    All methods require an active `AsyncSession` provided at instantiation.

    Attributes:
        session: The active SQLAlchemy async session used for all queries.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, filter_params: FilterParams) -> list[User]:
        """
        Retrieve a paginated and ordered list of all users.

        Args:
            filter_params: Pagination and ordering parameters, including `offset`,
                           `limit` and `order_by`.

        Returns:
            A list of `User` instances matching the given filter parameters.
            Returns an empty list if no users are found.
        """
        resp = await self.session.execute(
            select(User)
            .offset(filter_params.offset)
            .limit(filter_params.limit)
            .order_by(text(filter_params.order_by))
        )
        users = resp.scalars().all()
        return users

    async def get_by_id(self, user_id: UUID) -> User | None:
        """
        Retrieve a single user by the given ID.

        Args:
            user_id: A unique user ID.

        Returns:
            A `User` instance matching the ID or `None` if not found.
        """
        user = await self.session.get(User, user_id)
        return user

    async def get_by_username(self, username: str) -> User | None:
        """
        Retrieve a single user by the given unique username.

        Args:
            username: A unique username.

        Returns:
            A `User` instance matching the username or `None` if not found.
        """
        resp = await self.session.execute(select(User).where(User.username == username))
        user = resp.scalar_one_or_none()
        return user

    async def create(self, user_data: UserCreateHashSchema) -> User:
        """
        Persist a new user to the database.

        Args:
            user_data: Validated fields required to create a `User` instance.

        Returns:
            A newly created `User` instance with database-generated fields populated
            (e.g. `id`, `created_at`).
        """
        user = User(**user_data.model_dump())
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(
        self, user_id: UUID, user_data: UserUpdateHashSchema
    ) -> User | None:
        """
        Update a user by the given ID.

        Args:
            user_id: A unique user ID.
            user_data: Validated optional fields to update a `User` instance.

        Returns:
            An updated `User` instance or `None` if not found.
        """
        user = await self.get_by_id(user_id)

        if user is None:
            return None

        filtered_user_data = user_data.model_dump(exclude_unset=True)
        for name, value in filtered_user_data.items():
            setattr(user, name, value)
        return user

    async def delete(self, user_id: UUID) -> bool:
        """
        Delete a user by the given ID.

        Args:
            user_id: A unique user ID

        Returns:
            `True` if user was deleted. `False` if not found.
        """
        user = await self.get_by_id(user_id)

        if user is None:
            return False

        await self.session.delete(user)
        return True
