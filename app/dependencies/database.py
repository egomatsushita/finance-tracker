from typing import Annotated

from fastapi import Depends, HTTPException
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
            raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again shortly.")


SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
