from typing import Annotated

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session
from errors.database import ConflictError


async def get_async_session():
    """
    Yield an async database session, committing on success and rolling back on failure.
    Yields:
        AsyncSession: An active SQLAlchemy async session.
    Raises:
        ConflictError: If a database integrity constraint is violated.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise ConflictError()


SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
