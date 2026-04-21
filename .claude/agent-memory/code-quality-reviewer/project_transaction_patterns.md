---
name: Transaction model and repository patterns
description: Anti-patterns and design notes observed in the initial transaction schema/model/repo files (FT-22)
type: project
---

Observed in FT-22 diff (2026-04-20) across `app/models/transaction.py`, `app/repositories/transaction.py`, `app/schemas/transaction.py`, `app/schemas/params.py`:

1. **Duplicate method definitions**: `get_by_id` and `create` were defined twice in `TransactionRepository`. The second `create` definition was a stub (`...`), silently overriding the real implementation. Watch for this in repository classes going forward.

2. **SQL injection via `text(order_by)` in repository**: `filter_params.order_by` is passed directly to `text()` for ORDER BY. Even with a `Literal` type on the schema, the repository does not validate the string — if the Literal constraint is ever widened or bypassed, this is exploitable. Flag any use of `text()` with user-controlled input.

3. **`order_by` Literal does not include `transaction_date`**: `TransactionFilterParams` inherits `order_by: Literal["created_at", "updated_at"]` from `FilterParams`, but `transaction_date` is a natural and expected sort column for this domain. This mismatch is a functional gap worth noting.

4. **`TransactionUpdateSchema` cross-field validation gap**: When only `category` is provided (without `kind`), the validator skips the check — but the stored `kind` on the existing DB record is not known to the schema, so an invalid category can be persisted silently. Flag this pattern in any update schema that validates cross-field constraints without access to the current DB state.

5. **`amount` field has no lower-bound constraint**: `Decimal` with no `gt=0` or `ge=0` allows negative amounts to be stored. Financial data should explicitly validate sign.

6. **`category` stored as plain `String(50)` in the model but validated via enum in the schema**: There is no DB-level constraint on the category values. This is a known tradeoff (flexibility vs. integrity) but worth flagging when the enum list grows.

7. **`TransactionBase` exposes `user_id` as a client-supplied field**: In a typical auth flow the service layer should inject `user_id` from the verified token, not accept it from the request body. This is a potential IDOR/ownership bypass risk if `TransactionCreateSchema` is used directly in a router without overriding `user_id`.

8. **Model/migration type mismatch introduced in FT-23**: `FinancialTransaction.id` was changed from `BigInteger` to `Integer` in the model without a corresponding migration, creating drift between the ORM mapping and the actual DB column type (`BIGINT`). Watch for silent model/migration divergence on column types.

9. **`ValidationError` handler misaligned with FastAPI's pipeline (FT-23)**: A `pydantic.ValidationError` exception handler was added to `exception_handlers.py` to support the `TransactionFilterParams` date range validator. However, FastAPI wraps dependency validation errors in `RequestValidationError` and handles them natively — the bare `ValidationError` handler is redundant for `Depends()`-based validation and only fires for `model_validate()` calls outside the injection pipeline. Pattern to flag: adding a global `ValidationError` handler when the actual trigger is a `Depends()` model validator.

10. **Module-scoped fixtures mutated by tests (FT-23)**: `member_transaction` in `test_transactions.py` is `scope="module"` but `TestUpdateTransaction.test_partial_update` mutates its `description`. Any later test relying on original state will see dirty data. Flag `scope="module"` fixtures used in tests that perform writes.

11. **`delete` repository method now calls `session.flush()` before returning (FT-24)**: This is correct — `flush()` propagates the delete to the DB within the transaction without committing, consistent with `create` and `update`. This pattern is now consistent across all mutating repo methods.

12. **`transaction_date` added to `order_by` Literal (FT-24, resolved)**: Item 3 is now resolved — `TransactionFilterParams` overrides `order_by` with `Literal["created_at", "updated_at", "transaction_date"]`, and the repository uses a safe column-mapping dict `_ORDER_BY_COLUMNS` instead of `text()`. The SQL injection risk from item 2 is also resolved for this query path.

13. **`user_id` IDOR gap closed at repository level (FT-24, resolved)**: Item 7 is resolved — `get_by_id`, `update`, and `delete` now take `user_id` and scope all queries to the owning user. The service injects `user_id` from `current_user.id` (token-derived), not the request body. IDOR risk is eliminated for these operations.

14. **`TransactionFilterParams.model_validator` fires as `RequestValidationError` (FT-24, confirmed)**: The `model_validator(mode="after")` on `TransactionFilterParams` used as `Depends()` raises `ValueError`, which FastAPI wraps as `RequestValidationError` and returns 422 natively. No custom handler needed or added — tests confirm 422 is returned correctly. The redundant `ValidationError` handler from item 9 was NOT added in this diff (the prior memory note was a false alarm from FT-23 review; the current `exception_handlers.py` only registers `TransactionNotFoundError`).

15. **`member_transaction` fixture scope corrected (FT-24)**: Now `scope="function"` in `test_transactions.py`. The mutation concern from item 10 is resolved.

16. **`get_transaction_filter_params` raises `RequestValidationError` directly (FT-24)**: The dependency function in `app/dependencies/params.py` raises `RequestValidationError` manually for the date range check rather than raising `ValueError` and letting FastAPI's pipeline wrap it. This is an architectural inconsistency — the `model_validator` on `TransactionFilterParams` (which raises `ValueError`) would produce a 422 natively if the validation were kept on the schema. The manual `RequestValidationError` construction is more brittle (raw dict, no Pydantic error model) and duplicates logic that could live in the schema validator. Flag any dependency function that raises `RequestValidationError` directly when a schema-layer `ValueError` would suffice.

17. **No role-based scope on the transaction router (FT-24)**: All transaction endpoints are open to any authenticated user (member or admin). There is no admin-only path. This is intentional by design — users only see their own transactions (ownership enforced via `user_id`). This is fine, but future reviews should verify no admin-only write paths (e.g., bulk delete) are added to this router without adding a `RequireAdmin` dep.

18. **`TransactionReadSchema` exposes `user_id` (FT-24, by design)**: `user_id` is included in the response body. Since all transactions returned are already scoped to the current user, this is not a data leak — but it is unnecessary surface area. Flag if ever the response is used in a context where `user_id` should not be visible.

**Why:** These patterns were introduced together in the first transaction feature slice. Future reviews on transaction-related files should re-check item 4 (update schema cross-field validation without DB state) and item 16 (manual RequestValidationError in deps) as the most live risks remaining.
**How to apply:** When reviewing any router or service that uses `TransactionCreateSchema`, verify `user_id` is injected server-side (resolved for FT-24). On any diff widening `order_by` literals or adding new filter params, check for raw `text()` usage (now resolved via `_ORDER_BY_COLUMNS` dict). Check that model column types match the migration definitions. Item 4 (update category/kind cross-field without DB state) remains unresolved. Item 16 (manual RequestValidationError) is a standing pattern to discourage.
