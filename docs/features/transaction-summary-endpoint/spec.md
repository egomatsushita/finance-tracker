# Spec for Transaction Summary Endpoint

branch: FT-32_transaction-summary-endpoint

## Summary
The transactions API only supports list and get-by-id; there is no way to retrieve aggregated totals. The dashboard overview page needs income/expense totals, a net balance, a category breakdown, and a monthly trend without pulling every transaction and computing it client-side. Add `GET /transactions/summary`, scoped to the authenticated user, following the existing Router → Service → Repository pattern.

## Functional Requirements
- New response schema(s) in `app/schemas/transaction.py`:
  - `total_income: Decimal`
  - `total_expense: Decimal`
  - `net: Decimal` (income − expense)
  - `by_category: list[{kind, category, total}]`
  - `by_month: list[{month, income, expense}]` (`month` as `"YYYY-MM"`)
- New route `GET /transactions/summary` in `app/routers/transaction.py`, using `CurrentUserDep` the same way the existing list/detail routes do.
  - Must be declared before `/{transaction_id}` if route ordering could otherwise shadow it (mirrors the `/users/me` vs `/{user_id}` precedent).
- New service method in `app/services/transaction.py` that calls the repository and assembles the response schema (computing `net` from the two totals).
- New repository method in `app/repositories/transaction.py` using `func.sum` + `group_by`, scoped to `current_user.id`, calling `flush()` only (never `commit()`), consistent with the rest of the repository layer.
- Optional query params `transaction_date_from` / `transaction_date_to` (same semantics as the existing list endpoint's filters — inclusive bounds, `InvalidFilterError` if `from > to`), applied to all aggregates in the response.
- Add endpoint metadata/examples to `app/docs/` following the existing convention used for other transaction routes.

## Possible Edge Cases
- User has zero transactions — totals are `0`, `by_category` and `by_month` are empty lists, not an error.
- User has only income or only expense transactions — the missing side reports `0`, not absent.
- `transaction_date_from > transaction_date_to` — raises the existing `InvalidFilterError`, matching list-endpoint behavior.
- Date filters exclude all transactions — same as the zero-transactions case.
- Aggregation must only include the current user's transactions, never another user's (no cross-user leakage).
- Decimal precision/rounding in sums must match the underlying `Numeric(10, 2)` column (no floating-point drift).
- `/transactions/summary` must not be shadowed by `/{transaction_id}`'s `int` path converter (FastAPI would 404/422 if ordering is wrong — verify route registration order).

## Acceptance Criteria
- `GET /transactions/summary` returns `200` with correct `total_income`, `total_expense`, `net`, `by_category`, and `by_month` for the authenticated user's own transactions only.
- Optional date-range filters narrow the aggregation exactly as they do for the list endpoint, including the same validation error on an invalid range.
- A user with no matching transactions gets a well-formed zero-value response, not an error.
- No endpoint returns another user's transaction data.

## Open Questions
- None.

## Testing Guidelines
Create a test file in `./tests` for this feature, with meaningful but not excessive coverage:
- Summary reflects correct totals/net for a user with a mix of income and expense transactions.
- Summary for a user with no transactions returns zeroed totals and empty breakdown lists.
- `by_category` and `by_month` group correctly across multiple categories/months.
- Date-range filters narrow the result correctly, and an invalid range (`from > to`) raises the expected error.
- A second user's transactions never appear in another user's summary.
