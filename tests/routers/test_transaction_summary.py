from httpx import AsyncClient


async def _create_transaction(
    client: AsyncClient,
    token: str,
    amount: str,
    kind: str,
    category: str,
    transaction_date: str,
):
    response = await client.post(
        "/transactions/",
        json={
            "amount": amount,
            "kind": kind,
            "category": category,
            "transaction_date": transaction_date,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()


class TestTransactionSummary:
    async def test_summary_empty_for_new_user(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.get(
            "/transactions/summary",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_income"] == "0.00"
        assert body["total_expense"] == "0.00"
        assert body["net"] == "0.00"
        assert body["by_category"] == []
        assert body["by_month"] == []

    async def test_summary_totals_and_net(self, client: AsyncClient, member_token: str):
        await _create_transaction(
            client,
            member_token,
            "1500.00",
            "income",
            "salary",
            "2026-05-01T09:00:00Z",
        )
        await _create_transaction(
            client,
            member_token,
            "200.00",
            "expense",
            "groceries",
            "2026-05-02T09:00:00Z",
        )

        response = await client.get(
            "/transactions/summary",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_income"] == "1500.00"
        assert body["total_expense"] == "200.00"
        assert body["net"] == "1300.00"

    async def test_summary_by_category_groups_correctly(
        self, client: AsyncClient, member_token: str
    ):
        await _create_transaction(
            client,
            member_token,
            "50.00",
            "expense",
            "groceries",
            "2026-06-01T09:00:00Z",
        )
        await _create_transaction(
            client,
            member_token,
            "30.00",
            "expense",
            "groceries",
            "2026-06-02T09:00:00Z",
        )
        await _create_transaction(
            client,
            member_token,
            "40.00",
            "expense",
            "transport",
            "2026-06-03T09:00:00Z",
        )

        response = await client.get(
            "/transactions/summary"
            "?transaction_date_from=2026-06-01T00:00:00Z"
            "&transaction_date_to=2026-06-30T23:59:59Z",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        by_category = {
            (entry["kind"], entry["category"]): entry["total"]
            for entry in response.json()["by_category"]
        }
        assert by_category[("expense", "groceries")] == "80.00"
        assert by_category[("expense", "transport")] == "40.00"

    async def test_summary_by_month_groups_correctly(
        self, client: AsyncClient, member_token: str
    ):
        await _create_transaction(
            client,
            member_token,
            "100.00",
            "income",
            "salary",
            "2026-07-01T09:00:00Z",
        )
        await _create_transaction(
            client,
            member_token,
            "20.00",
            "expense",
            "groceries",
            "2026-07-02T09:00:00Z",
        )
        await _create_transaction(
            client,
            member_token,
            "200.00",
            "income",
            "salary",
            "2026-08-01T09:00:00Z",
        )

        response = await client.get(
            "/transactions/summary"
            "?transaction_date_from=2026-07-01T00:00:00Z"
            "&transaction_date_to=2026-08-31T23:59:59Z",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        by_month = {entry["month"]: entry for entry in response.json()["by_month"]}
        assert by_month["2026-07"]["income"] == "100.00"
        assert by_month["2026-07"]["expense"] == "20.00"
        assert by_month["2026-08"]["income"] == "200.00"
        assert by_month["2026-08"]["expense"] == "0.00"

    async def test_summary_date_range_filter(
        self, client: AsyncClient, member_token: str
    ):
        await _create_transaction(
            client,
            member_token,
            "500.00",
            "income",
            "salary",
            "2026-09-01T09:00:00Z",
        )
        await _create_transaction(
            client,
            member_token,
            "999.00",
            "income",
            "salary",
            "2026-10-01T09:00:00Z",
        )

        response = await client.get(
            "/transactions/summary"
            "?transaction_date_from=2026-09-01T00:00:00Z"
            "&transaction_date_to=2026-09-30T23:59:59Z",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_income"] == "500.00"

    async def test_summary_invalid_date_range(
        self, client: AsyncClient, member_token: str
    ):
        response = await client.get(
            "/transactions/summary"
            "?transaction_date_from=2026-02-01T00:00:00Z"
            "&transaction_date_to=2026-01-01T00:00:00Z",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 422

    async def test_summary_scoped_to_own_user(
        self, client: AsyncClient, member_token: str, admin_token: str
    ):
        await _create_transaction(
            client,
            member_token,
            "321.00",
            "expense",
            "entertainment",
            "2026-11-01T09:00:00Z",
        )

        response = await client.get(
            "/transactions/summary",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_income"] == "0.00"
        assert body["total_expense"] == "0.00"
        assert body["net"] == "0.00"

    async def test_summary_unauthenticated(self, client: AsyncClient):
        response = await client.get("/transactions/summary")
        assert response.status_code == 401
