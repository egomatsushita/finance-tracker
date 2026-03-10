from typing import Annotated

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session


async def get_async_session():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
