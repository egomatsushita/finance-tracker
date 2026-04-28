import logging
from uuid import uuid4

import pytest

from errors.user import UserAlreadyExistError, UserNotFoundError
from schemas.user import UserCreateSchema, UserUpdateAdminSchema
from services.user import UserService


@pytest.fixture
async def session(override_db):
    async with override_db() as s:
        yield s


@pytest.fixture
async def service(session):
    return UserService(session)


@pytest.fixture
async def created_user(service):
    uid = str(uuid4())[:8]
    data = UserCreateSchema(
        username=f"user_{uid}",
        email=f"user_{uid}@example.com",
        password="password",
    )
    return await service.create(data)


class TestCreate:
    async def test_persists_and_returns_schema(self, service):
        uid = str(uuid4())[:8]
        data = UserCreateSchema(
            username=f"new_{uid}",
            email=f"new_{uid}@example.com",
            password="password",
        )
        result = await service.create(data)
        assert result.id is not None
        assert result.username == data.username

    async def test_raises_on_duplicate_username(self, service, created_user):
        data = UserCreateSchema(
            username=created_user.username,
            email="other@example.com",
            password="password",
        )
        with pytest.raises(UserAlreadyExistError):
            await service.create(data)


class TestUpdate:
    async def test_applies_partial_fields(self, service, created_user):
        uid = str(uuid4())[:8]
        data = UserUpdateAdminSchema(username=f"updated_{uid}")
        result = await service.update(created_user.id, data)
        assert result.username == f"updated_{uid}"

    async def test_raises_for_nonexistent(self, service):
        with pytest.raises(UserNotFoundError):
            await service.update(uuid4(), UserUpdateAdminSchema(username="x"))


class TestDelete:
    async def test_raises_for_nonexistent(self, service):
        with pytest.raises(UserNotFoundError):
            await service.delete(uuid4())


class TestLogging:
    async def test_create_emits_info(self, service, caplog):
        uid = str(uuid4())[:8]
        data = UserCreateSchema(
            username=f"log_{uid}",
            email=f"log_{uid}@example.com",
            password="password",
        )
        with caplog.at_level(logging.INFO, logger="services.user"):
            result = await service.create(data)
        assert any(
            "user_created" in r.message and str(result.id) in r.message
            for r in caplog.records
        )

    async def test_update_logs_field_names_not_values(
        self, service, created_user, caplog
    ):
        uid = str(uuid4())[:8]
        new_username = f"renamed_{uid}"
        data = UserUpdateAdminSchema(username=new_username)
        with caplog.at_level(logging.INFO, logger="services.user"):
            await service.update(created_user.id, data)
        record = next((r for r in caplog.records if "user_updated" in r.message), None)
        assert record is not None
        assert "username" in record.message
        assert new_username not in record.message

    async def test_delete_emits_info(self, service, created_user, caplog):
        with caplog.at_level(logging.INFO, logger="services.user"):
            await service.delete(created_user.id)
        assert any(
            "user_deleted" in r.message and str(created_user.id) in r.message
            for r in caplog.records
        )
