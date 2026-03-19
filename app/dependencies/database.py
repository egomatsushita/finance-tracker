from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session


async def get_async_session():
    """
    Yield an SQLAlchemy `AsyncSession` for user as a FastAPI dependency.

    Commits the session after it completes successfully.
    If an `IntegrityError` is raised, the session is rolled back and a 409 HTTP exception is raised.

    Yields:
        AsyncSession: An active SQLAlchemy async session.

    Raises:
        HTTPException: 409 Conflict error if an `IntegrityError` occurs during the session.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=409, detail="A conflict occurred.")


SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
