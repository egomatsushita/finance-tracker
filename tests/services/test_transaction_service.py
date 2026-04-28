import logging
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from errors.transaction import TransactionNotFoundError
from models.transaction import FinancialTransaction
from schemas.params import TransactionFilterParams
from schemas.transaction import TransactionCreateSchema, TransactionUpdateSchema
from services.transaction import TransactionService


@pytest.fixture
async def session(override_db):
    async with override_db() as s:
        yield s


@pytest.fixture
async def service(session):
    return TransactionService(session)


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def other_user_id():
    return uuid4()


@pytest.fixture
async def transaction(session, user_id):
    t = FinancialTransaction(
        amount="75.00",
        kind="expense",
        category="health",
        user_id=user_id,
        transaction_date=datetime(2026, 3, 1, tzinfo=timezone.utc),
    )
    session.add(t)
    await session.flush()
    await session.refresh(t)
    return t


class TestGetAll:
    async def test_returns_user_transactions(self, service, user_id, transaction):
        result = await service.get_all(user_id, TransactionFilterParams())
        ids = [t.id for t in result]
        assert transaction.id in ids

    async def test_does_not_return_other_users(
        self, service, other_user_id, transaction
    ):
        result = await service.get_all(other_user_id, TransactionFilterParams())
        ids = [t.id for t in result]
        assert transaction.id not in ids


class TestGetById:
    async def test_returns_own_transaction(self, service, user_id, transaction):
        result = await service.get_by_id(user_id, transaction.id)
        assert result.id == transaction.id

    async def test_raises_for_wrong_user(self, service, other_user_id, transaction):
        with pytest.raises(TransactionNotFoundError):
            await service.get_by_id(other_user_id, transaction.id)

    async def test_raises_for_nonexistent(self, service, user_id):
        with pytest.raises(TransactionNotFoundError):
            await service.get_by_id(user_id, 999999)


class TestCreate:
    async def test_persists_and_returns_schema(self, service, user_id):
        data = TransactionCreateSchema(
            amount="200.00",
            kind="income",
            category="salary",
            transaction_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        )
        result = await service.create(user_id, data)
        assert result.id is not None
        assert result.amount == data.amount
        assert result.user_id == user_id


class TestUpdate:
    async def test_applies_partial_fields(self, service, user_id, transaction):
        data = TransactionUpdateSchema(description="Updated")
        result = await service.update(user_id, transaction.id, data)
        assert result.description == "Updated"
        assert result.amount == transaction.amount

    async def test_raises_for_wrong_user(self, service, other_user_id, transaction):
        with pytest.raises(TransactionNotFoundError):
            await service.update(
                other_user_id, transaction.id, TransactionUpdateSchema()
            )


class TestDelete:
    async def test_raises_for_wrong_user(self, service, other_user_id, transaction):
        with pytest.raises(TransactionNotFoundError):
            await service.delete(other_user_id, transaction.id)

    async def test_raises_for_nonexistent(self, service, user_id):
        with pytest.raises(TransactionNotFoundError):
            await service.delete(user_id, 999999)

    async def test_deletes_own_transaction(self, service, session, user_id):
        t = FinancialTransaction(
            amount="30.00",
            kind="expense",
            category="clothing",
            user_id=user_id,
            transaction_date=datetime(2026, 5, 1, tzinfo=timezone.utc),
        )
        session.add(t)
        await session.flush()
        await session.refresh(t)

        t_id = t.id
        await service.delete(user_id, t_id)

        assert await session.get(FinancialTransaction, t_id) is None


class TestLogging:
    async def test_create_emits_info(self, service, user_id, caplog):
        data = TransactionCreateSchema(
            amount="10.00",
            kind="income",
            category="salary",
            transaction_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        with caplog.at_level(logging.INFO, logger="services.transaction"):
            result = await service.create(user_id, data)
        assert any(
            "transaction_created" in r.message
            and str(result.id) in r.message
            and str(user_id) in r.message
            for r in caplog.records
        )

    async def test_update_emits_info(self, service, user_id, transaction, caplog):
        data = TransactionUpdateSchema(description="Log test")
        with caplog.at_level(logging.INFO, logger="services.transaction"):
            result = await service.update(user_id, transaction.id, data)
        assert any(
            "transaction_updated" in r.message and str(result.id) in r.message
            for r in caplog.records
        )

    async def test_delete_emits_info(self, service, session, user_id, caplog):
        t = FinancialTransaction(
            amount="5.00",
            kind="expense",
            category="clothing",
            user_id=user_id,
            transaction_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
        )
        session.add(t)
        await session.flush()
        await session.refresh(t)
        t_id = t.id

        with caplog.at_level(logging.INFO, logger="services.transaction"):
            await service.delete(user_id, t_id)
        assert any(
            "transaction_deleted" in r.message and str(t_id) in r.message
            for r in caplog.records
        )
