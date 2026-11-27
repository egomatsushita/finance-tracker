# Plan: Transaction Summary Endpoint (FT-32)

Spec: `_specs/transaction-summary-endpoint.md`

## Context
Dashboard overview needs income/expense totals, net, category breakdown, and monthly trend — currently only list/get-by-id exist. Add `GET /transactions/summary`, scoped to the current user, following Router → Service → Repository. Critical ordering constraint: it must be registered before `GET /{transaction_id}`, since `"summary"` would otherwise match that route's `{transaction_id}` path segment and fail `int` coercion with a 422 instead of reaching the new handler. TDD: tests first.

## Files touched
- `app/schemas/transaction.py` — new response schemas
- `app/schemas/params.py` — new minimal summary filter params (date range only)
- `app/dependencies/params.py` — new filter dependency (reuses existing from/to validation)
- `app/repositories/transaction.py` — new aggregation method
- `app/services/transaction.py` — new service method
- `app/routers/transaction.py` — new route (declared before `/{transaction_id}`)
- `app/docs/transaction.py` — new endpoint metadata
- `tests/routers/test_transaction_summary.py` — new test file

## Step 1 — Tests first (red)
Create `tests/routers/test_transaction_summary.py`, reusing `client`/`member_token`/`member_user`/`admin_token` fixtures. Create transactions via `POST /transactions/` in test setup (not direct DB inserts, to match existing test style in `test_transactions.py` — check that file's pattern first and follow it).

1. `test_summary_empty_for_new_user` — a user with no transactions → `200`, `total_income == "0.00"`, `total_expense == "0.00"`, `net == "0.00"`, `by_category == []`, `by_month == []`.
2. `test_summary_totals_and_net` — create one income (`amount=1500.00, kind=income, category=salary`) and one expense (`amount=200.00, kind=expense, category=groceries`) for the same user → `total_income == "1500.00"`, `total_expense == "200.00"`, `net == "1300.00"`.
3. `test_summary_by_category_groups_correctly` — create two expenses in the same category and one in a different category → assert the matching `by_category` entries have correctly summed `total` values.
4. `test_summary_by_month_groups_correctly` — create transactions with `transaction_date` in two different months → assert two `by_month` entries with correct `month` (`"YYYY-MM"`) keys and correct per-kind sums.
5. `test_summary_date_range_filter` — create transactions across two dates, call with `transaction_date_from`/`transaction_date_to` narrowing to one → assert totals reflect only the included transaction.
6. `test_summary_invalid_date_range` — `transaction_date_from > transaction_date_to` → `422` (matches existing `InvalidFilterError` behavior for the list endpoint).
7. `test_summary_scoped_to_own_user` — create a transaction for `member_user`, call summary as `admin_token` (a different user) → admin's summary does not include the member's transaction (admin's own totals stay `0.00` if admin has no transactions of their own).
8. `test_summary_unauthenticated` — no `Authorization` header → `401`.

Run `uv run pytest tests/routers/test_transaction_summary.py` — expect failures (404, no route yet).

## Step 2 — Implement (green)

1. **`app/schemas/params.py`** — add:
   ```python
   class TransactionSummaryFilterParams(BaseModel):
       transaction_date_from: datetime | None = None
       transaction_date_to: datetime | None = None
   ```

2. **`app/dependencies/params.py`** — add a dependency mirroring `get_transaction_filter_params`'s date-range validation:
   ```python
   def get_transaction_summary_filter_params(
       params: Annotated[TransactionSummaryFilterParams, Depends()],
   ) -> TransactionSummaryFilterParams:
       if (
           params.transaction_date_from is not None
           and params.transaction_date_to is not None
           and params.transaction_date_from > params.transaction_date_to
       ):
           raise InvalidFilterError(
               "transaction_date_from must be before transaction_date_to"
           )
       return params

   TransactionSummaryFilterParamsDep = Annotated[
       TransactionSummaryFilterParams, Depends(get_transaction_summary_filter_params)
   ]
   ```

3. **`app/schemas/transaction.py`** — add:
   ```python
   class CategorySummary(Base):
       kind: TransactionKindEnum
       category: str
       total: Decimal

   class MonthSummary(Base):
       month: str
       income: Decimal
       expense: Decimal

   class TransactionSummarySchema(Base):
       total_income: Decimal
       total_expense: Decimal
       net: Decimal
       by_category: list[CategorySummary]
       by_month: list[MonthSummary]
   ```

4. **`app/repositories/transaction.py`** — add `get_summary(self, user_id, filter_params) -> ...`. Use `func.sum`, `func.strftime("%Y-%m", FinancialTransaction.transaction_date)` (SQLite-compatible month bucketing — confirm this works against the in-memory SQLite test DB since the project only targets SQLite per `database_url` default) grouped by `kind` for totals, grouped by `(kind, category)` for category breakdown, and grouped by month for the monthly trend. Apply the same `transaction_date_from`/`_to` filters as `get_all`, scoped to `user_id`. Return raw rows (or a small internal dict/namedtuple) — let the service shape them into `TransactionSummarySchema`.

5. **`app/services/transaction.py`** — add `get_summary(self, user_id, filter_params) -> TransactionSummarySchema` that calls the repo, computes `net = total_income - total_expense`, and assembles the schema. Ensure `Decimal("0.00")` defaults when no rows exist for income/expense (not `None`).

6. **`app/routers/transaction.py`** — add, declared **immediately after the `POST /` route and before `GET /{transaction_id}`**:
   ```python
   @transaction_router.get(
       "/summary",
       status_code=200,
       **transaction_endpoints["summary"],
       response_model=TransactionSummarySchema,
   )
   async def read_transaction_summary(
       service: ServiceDep,
       current_user: CurrentUserDep,
       filter_params: TransactionSummaryFilterParamsDep,
   ) -> TransactionSummarySchema:
       """
       Retrieve aggregated income/expense totals, category breakdown, and
       monthly trend for the authenticated user's transactions.
       """
       return await service.get_summary(current_user.id, filter_params)
   ```

7. **`app/docs/transaction.py`** — add a `"summary"` entry to `transaction_endpoints` (summary: "Get transaction summary", description covering totals/by_category/by_month and optional date-range filters).

8. Run `uv run pytest tests/routers/test_transaction_summary.py` until green, then `uv run pytest` for the full suite.

## Step 3 — Commit
One commit: `[FT-32] feat: add GET /transactions/summary endpoint`.

## Verification
- `uv run pytest tests/routers/test_transaction_summary.py -v` passes, including empty-state, grouping, date-filter, invalid-range, and cross-user isolation cases.
- `uv run pytest` (full suite) passes — confirms route ordering didn't break `GET /{transaction_id}` and existing transaction tests.
- Manual sanity check (optional): create a few transactions via the API for one user, call `GET /transactions/summary`, confirm totals/by_category/by_month match expectations; confirm `GET /transactions/summary` still resolves correctly (not a 422) with the route declared before `/{transaction_id}`.
