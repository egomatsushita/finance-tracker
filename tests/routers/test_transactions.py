from datetime import datetime, timezone

import pytest
from helpers import AuthCookies, auth_kwargs
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
async def member_transactions(override_db, member_user):
    async with override_db() as session:
        transactions = [
            FinancialTransaction(
                amount="10.00",
                kind="expense",
                category="groceries",
                user_id=member_user.id,
                transaction_date=datetime(2026, 1, 5, tzinfo=timezone.utc),
            ),
            FinancialTransaction(
                amount="20.00",
                kind="expense",
                category="groceries",
                user_id=member_user.id,
                transaction_date=datetime(2026, 1, 15, tzinfo=timezone.utc),
            ),
            FinancialTransaction(
                amount="30.00",
                kind="expense",
                category="groceries",
                user_id=member_user.id,
                transaction_date=datetime(2026, 1, 25, tzinfo=timezone.utc),
            ),
        ]
        session.add_all(transactions)
        await session.commit()
        for t in transactions:
            await session.refresh(t)
        return transactions


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
        self, client: AsyncClient, member_token: AuthCookies, member_transaction
    ):
        response = await client.get(
            "/transactions/",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        ids = [t["id"] for t in body]
        assert member_transaction.id in ids

    async def test_does_not_return_other_users_transactions(
        self,
        client: AsyncClient,
        member_token: AuthCookies,
        other_user_transaction,
    ):
        response = await client.get(
            "/transactions/",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        ids = [t["id"] for t in response.json()]
        assert other_user_transaction.id not in ids

    async def test_filter_by_kind(
        self, client: AsyncClient, member_token: AuthCookies, member_transaction
    ):
        response = await client.get(
            "/transactions/?kind=expense",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        assert all(t["kind"] == "expense" for t in response.json())

    async def test_filter_by_category(
        self, client: AsyncClient, member_token: AuthCookies, member_transaction
    ):
        response = await client.get(
            "/transactions/?category=groceries",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        assert all(t["category"] == "groceries" for t in response.json())

    async def test_filter_by_date_range(
        self, client: AsyncClient, member_token: AuthCookies, member_transaction
    ):
        response = await client.get(
            "/transactions/?transaction_date_from=2026-01-01T00:00:00Z"
            "&transaction_date_to=2026-01-31T00:00:00Z",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        ids = [t["id"] for t in response.json()]
        assert member_transaction.id in ids

    async def test_invalid_date_range_returns_422(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.get(
            "/transactions/?transaction_date_from=2026-02-01T00:00:00Z"
            "&transaction_date_to=2026-01-01T00:00:00Z",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 422

    async def test_no_token(self, client: AsyncClient):
        response = await client.get("/transactions/")
        assert response.status_code == 401


class TestSortDir:
    async def test_sort_dir_desc_reverses_order(
        self, client: AsyncClient, member_token: AuthCookies, member_transactions
    ):
        response = await client.get(
            "/transactions/?order_by=transaction_date&sort_dir=desc&limit=100",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        fixture_ids = {t.id for t in member_transactions}
        ids = [t["id"] for t in response.json() if t["id"] in fixture_ids]
        expected_ids = [
            t.id
            for t in sorted(
                member_transactions, key=lambda t: t.transaction_date, reverse=True
            )
        ]
        assert ids == expected_ids

    async def test_omitting_sort_dir_preserves_ascending_default(
        self, client: AsyncClient, member_token: AuthCookies, member_transactions
    ):
        response = await client.get(
            "/transactions/?order_by=transaction_date&limit=100",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        fixture_ids = {t.id for t in member_transactions}
        ids = [t["id"] for t in response.json() if t["id"] in fixture_ids]
        expected_ids = [
            t.id for t in sorted(member_transactions, key=lambda t: t.transaction_date)
        ]
        assert ids == expected_ids

    async def test_invalid_sort_dir_returns_422(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.get(
            "/transactions/?sort_dir=bogus",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 422


class TestCreateTransaction:
    async def test_valid(self, client: AsyncClient, member_token: AuthCookies):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "25.50",
                "kind": "expense",
                "category": "transport",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["amount"] == "25.50"
        assert body["kind"] == "expense"
        assert body["category"] == "transport"

    async def test_dropped_category_returns_422(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "25.50",
                "kind": "expense",
                "category": "clothing",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 422

    async def test_mismatched_kind_category_returns_422(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "100.00",
                "kind": "income",
                "category": "groceries",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 422

    async def test_negative_amount_returns_422(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.post(
            "/transactions/",
            json={
                "amount": "-10.00",
                "kind": "expense",
                "category": "groceries",
                "transaction_date": "2026-03-10T10:00:00Z",
            },
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 422

    async def test_no_token(self, client: AsyncClient):
        response = await client.post("/transactions/", json={})
        assert response.status_code == 401


class TestGetTransaction:
    async def test_own_transaction(
        self, client: AsyncClient, member_token: AuthCookies, member_transaction
    ):
        response = await client.get(
            f"/transactions/{member_transaction.id}",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 200
        assert response.json()["id"] == member_transaction.id

    async def test_other_user_transaction_returns_404(
        self,
        client: AsyncClient,
        member_token: AuthCookies,
        other_user_transaction,
    ):
        response = await client.get(
            f"/transactions/{other_user_transaction.id}",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 404

    async def test_nonexistent_returns_404(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.get(
            "/transactions/999999",
            **auth_kwargs(member_token),
        )
        assert response.status_code == 404

    async def test_no_token(self, client: AsyncClient, member_transaction):
        response = await client.get(f"/transactions/{member_transaction.id}")
        assert response.status_code == 401


class TestUpdateTransaction:
    async def test_partial_update(
        self, client: AsyncClient, member_token: AuthCookies, member_transaction
    ):
        response = await client.patch(
            f"/transactions/{member_transaction.id}",
            json={"description": "Updated description"},
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 200
        assert response.json()["description"] == "Updated description"

    async def test_nonexistent_returns_404(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.patch(
            "/transactions/999999",
            json={"description": "x"},
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 404

    async def test_other_user_transaction_returns_404(
        self,
        client: AsyncClient,
        member_token: AuthCookies,
        other_user_transaction,
    ):
        response = await client.patch(
            f"/transactions/{other_user_transaction.id}",
            json={"description": "x"},
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 404

    async def test_no_token(self, client: AsyncClient, member_transaction):
        response = await client.patch(f"/transactions/{member_transaction.id}", json={})
        assert response.status_code == 401


class TestDeleteTransaction:
    async def test_deletes_own_transaction(
        self, client: AsyncClient, member_token: AuthCookies, override_db, member_user
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
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 204

    async def test_nonexistent_returns_404(
        self, client: AsyncClient, member_token: AuthCookies
    ):
        response = await client.delete(
            "/transactions/999999",
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 404

    async def test_other_user_transaction_returns_404(
        self,
        client: AsyncClient,
        member_token: AuthCookies,
        other_user_transaction,
    ):
        response = await client.delete(
            f"/transactions/{other_user_transaction.id}",
            **auth_kwargs(member_token, csrf=True),
        )
        assert response.status_code == 404

    async def test_no_token(self, client: AsyncClient, member_transaction):
        response = await client.delete(f"/transactions/{member_transaction.id}")
        assert response.status_code == 401
