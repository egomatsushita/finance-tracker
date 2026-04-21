from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from models.transaction import FinancialTransaction


@pytest.fixture(scope="function")
async def member_transaction(override_db, member_user):
    async with override_db() as session:
        transaction = FinancialTransaction(
            amount="50.00",
            kind="expense",
            category="groceries",
            description="Weekly groceries",
            user_id=member_user.id,
            transaction_date=datetime(2026, 1, 15, tzinfo=timezone.utc),
        )
        session.add(transaction)
        await session.commit()
        await session.refresh(transaction)
        return transaction


@pytest.fixture(scope="function")
async def other_user_transaction(override_db, admin_user):
    async with override_db() as session:
        transaction = FinancialTransaction(
            amount="100.00",
            kind="income",
            category="salary",
            user_id=admin_user.id,
            transaction_date=datetime(2026, 1, 20, tzinfo=timezone.utc),
        )
        session.add(transaction)
        await session.commit()
        await session.refresh(transaction)
        return transaction


class TestListTransactions:
    async def test_returns_own_transactions(
        self, client: AsyncClient, member_token: str, member_transaction
    ):
        response = await client.get(
            "/transactions/",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        ids = [t["id"] for t in body]
        assert member_transaction.id in ids

    async def test_does_not_return_other_users_transactions(
        self,
        client: AsyncClient,
        member_token: str,
        other_user_transaction,
    ):
        response = await client.get(
            "/transactions/",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        ids = [t["id"] for t in response.json()]
        assert other_user_transaction.id not in ids

    async def test_filter_by_kind(
        self, client: AsyncClient, member_token: str, member_transaction
    ):
        response = await client.get(
            "/transactions/?kind=expense",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        assert all(t["kind"] == "expense" for t in response.json())

    async def test_filter_by_category(
        self, client: AsyncClient, member_token: str, member_transaction
    ):
        response = await client.get(
            "/transactions/?category=groceries",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        assert all(t["category"] == "groceries" for t in response.json())

    async def test_filter_by_date_range(
        self, client: AsyncClient, member_token: str, member_transaction
    ):
        response = await client.get(
            "/transactions/?transaction_date_from=2026-01-01T00:00:00Z"
            "&transaction_date_to=2026-01-31T00:00:00Z",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        ids = [t["id"] for t in response.json()]
        assert member_transaction.id in ids

    async def test_invalid_date_range_returns_422(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.get(
            "/transactions/?transaction_date_from=2026-02-01T00:00:00Z"
            "&transaction_date_to=2026-01-01T00:00:00Z",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 422

    async def test_no_token(self, client: AsyncClient):
        response = await client.get("/transactions/")
        assert response.status_code == 401


class TestCreateTransaction:
    async def test_valid(self, client: AsyncClient, member_token: str):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "25.50",
                "kind": "expense",
                "category": "transport",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["amount"] == "25.50"
        assert body["kind"] == "expense"
        assert body["category"] == "transport"

    async def test_mismatched_kind_category_returns_422(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "100.00",
                "kind": "income",
                "category": "groceries",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 422

    async def test_negative_amount_returns_422(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "-10.00",
                "kind": "expense",
                "category": "groceries",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 422

    async def test_no_token(self, client: AsyncClient):
        response = await client.post("/transactions/", json={})
        assert response.status_code == 401


class TestGetTransaction:
    async def test_own_transaction(
        self, client: AsyncClient, member_token: str, member_transaction
    ):
        response = await client.get(
            f"/transactions/{member_transaction.id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        assert response.json()["id"] == member_transaction.id

    async def test_other_user_transaction_returns_404(
        self,
        client: AsyncClient,
        member_token: str,
        other_user_transaction,
    ):
        response = await client.get(
            f"/transactions/{other_user_transaction.id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 404

    async def test_nonexistent_returns_404(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.get(
            "/transactions/999999",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 404

    async def test_no_token(self, client: AsyncClient, member_transaction):
        response = await client.get(f"/transactions/{member_transaction.id}")
        assert response.status_code == 401


class TestUpdateTransaction:
    async def test_partial_update(
        self, client: AsyncClient, member_token: str, member_transaction
    ):
        response = await client.patch(
            f"/transactions/{member_transaction.id}",
            json={"description": "Updated description"},
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        assert response.json()["description"] == "Updated description"

    async def test_nonexistent_returns_404(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.patch(
            "/transactions/999999",
            json={"description": "x"},
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 404

    async def test_other_user_transaction_returns_404(
        self,
        client: AsyncClient,
        member_token: str,
        other_user_transaction,
    ):
        response = await client.patch(
            f"/transactions/{other_user_transaction.id}",
            json={"description": "x"},
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 404

    async def test_no_token(self, client: AsyncClient, member_transaction):
        response = await client.patch(f"/transactions/{member_transaction.id}", json={})
        assert response.status_code == 401


class TestDeleteTransaction:
    async def test_deletes_own_transaction(
        self, client: AsyncClient, member_token: str, override_db, member_user
    ):
        async with override_db() as session:
            transaction = FinancialTransaction(
                amount="10.00",
                kind="expense",
                category="other",
                user_id=member_user.id,
                transaction_date=datetime(2026, 2, 1, tzinfo=timezone.utc),
            )
            session.add(transaction)
            await session.commit()
            await session.refresh(transaction)

        response = await client.delete(
            f"/transactions/{transaction.id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 204

    async def test_nonexistent_returns_404(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.delete(
            "/transactions/999999",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 404

    async def test_other_user_transaction_returns_404(
        self,
        client: AsyncClient,
        member_token: str,
        other_user_transaction,
    ):
        response = await client.delete(
            f"/transactions/{other_user_transaction.id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 404

    async def test_no_token(self, client: AsyncClient, member_transaction):
        response = await client.delete(f"/transactions/{member_transaction.id}")
        assert response.status_code == 401
