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

**Why:** These patterns were introduced together in the first transaction feature slice. Future reviews on transaction-related files should re-check items 3, 4, and 7 as the router layer is built out.
**How to apply:** When reviewing any router or service that uses `TransactionCreateSchema`, verify `user_id` is injected server-side. On any diff widening `order_by` literals or adding new filter params, check for raw `text()` usage.
