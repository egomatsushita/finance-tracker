import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from dependencies.database import get_async_session
from errors.database import ConflictError
from main import app
from models.base import Base
from models.user import User
from services.auth import AuthService

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


@pytest.fixture(scope="session")
async def override_db(db_engine):
    session_factory = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_get_async_session():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except IntegrityError:
                await session.rollback()
                raise ConflictError()

    app.dependency_overrides[get_async_session] = _override_get_async_session
    try:
        yield session_factory
    finally:
        app.dependency_overrides.clear()


@pytest.fixture(scope="session")
async def admin_user(override_db):
    async with override_db() as session:
        user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=AuthService.create_hashed_password("admin"),
            role="admin",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture(scope="session")
async def client(override_db):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture(scope="session")
async def admin_token(client, admin_user):
    response = await client.post(
        "/auth/token",
        data={"username": "admin", "password": "admin"},
    )
    return response.json()["access_token"]
