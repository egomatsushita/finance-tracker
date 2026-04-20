# Plan: Transaction Service and Router (FT-24)

## Context

The transaction feature already has a model, schemas, and repository. This plan completes the stack by adding the service and router layers, following the existing User patterns exactly. Transactions are always user-scoped — a member can only manage their own transactions, and no admin transaction access exists.

---

## 1. Add `TransactionNotFoundError`

**File:** `app/errors/transaction.py` (new)

```python
class TransactionError(Exception):
    pass

class TransactionNotFoundError(TransactionError):
    def __init__(self):
        super().__init__("Transaction not found.")
```

Register in `app/exception_handlers.py`: import `TransactionNotFoundError`, add handler mapping it to HTTP 404 (same pattern as `UserNotFoundError`).

---

## 2. Add date range validation to `TransactionFilterParams`

**File:** `app/schemas/params.py`

Add a `@model_validator(mode="after")` on `TransactionFilterParams` that raises `ValueError("transaction_date_from must be before transaction_date_to")` when both are set and `transaction_date_from > transaction_date_to`. Pydantic surfaces this as HTTP 422.

---

## 3. `TransactionService`

**File:** `app/services/transaction.py` (new)

```
__init__(session: AsyncSession)
  → self.repo = TransactionRepository(session)

get_all(user_id, filter_params) → list[TransactionReadSchema]
  → delegates to repo.get_all, validates with TransactionReadSchema

get_by_id(user_id, transaction_id) → TransactionReadSchema
  → repo.get_by_id(transaction_id)
  → if None OR transaction.user_id != user_id: raise TransactionNotFoundError
  → return TransactionReadSchema.model_validate(transaction)

create(user_id, data) → TransactionReadSchema
  → repo.create(user_id, data)
  → return TransactionReadSchema.model_validate(result)

update(user_id, transaction_id, data) → TransactionReadSchema
  → get_by_id(user_id, transaction_id)  # raises if not found/not owner
  → repo.update(transaction_id, data)
  → return TransactionReadSchema.model_validate(result)

delete(user_id, transaction_id) → None
  → get_by_id(user_id, transaction_id)  # raises if not found/not owner
  → repo.delete(transaction_id)
```

All methods include structured docstrings (description / Args / Returns / Raises).

**Ownership note:** `get_by_id` enforces ownership by checking `transaction.user_id != user_id` and raising `TransactionNotFoundError` (not 403) to avoid leaking existence of other users' records. `update` and `delete` reuse `get_by_id` for the ownership check.

---

## 4. `TransactionRouter`

**File:** `app/routers/transaction.py` (new)

```
APIRouter(prefix="/transactions", tags=["transactions"])

ServiceDep = Annotated[TransactionService, get_service_dep(TransactionService)]
FilterParamsDep = Annotated[TransactionFilterParams, Depends(TransactionFilterParams)]

GET  /                   → list[TransactionReadSchema]       (200)
POST /                   → TransactionReadSchema              (201)
GET  /{transaction_id}   → TransactionReadSchema             (200)
PUT  /{transaction_id}   → TransactionReadSchema             (200)
DELETE /{transaction_id} → Response(status_code=204)
```

Each handler injects `current_user: CurrentUserDep` and passes `current_user.id` as `user_id` to the service. No path-level ownership dependency needed — user_id is always inferred from the token.

---

## 5. Register the router

**File:** `app/main.py`

Import `transaction_router` from `routers.transaction` and add `app.include_router(transaction_router)` alongside the existing routers.

---

## 6. Tests

**`tests/routers/test_transactions.py`** — integration tests via `AsyncClient`:
- `GET /transactions/` returns only the authenticated user's transactions
- `GET /transactions/` with `kind`, `category`, date range filters returns correct subset
- `GET /transactions/` with `date_from > date_to` returns 422
- `POST /transactions/` with valid payload returns 201
- `POST /transactions/` with mismatched kind/category returns 422
- `GET /transactions/{id}` returns the transaction for its owner
- `GET /transactions/{id}` returns 404 for non-existent or another user's transaction
- `PUT /transactions/{id}` with partial data updates only supplied fields
- `PUT /transactions/{id}` on non-existent transaction returns 404
- `DELETE /transactions/{id}` returns 204
- `DELETE /transactions/{id}` on non-existent transaction returns 404
- Unauthenticated request returns 401

**`tests/services/test_transaction_service.py`** — unit tests against in-memory DB:
- `get_all` filters by user_id (doesn't return other users' transactions)
- `get_by_id` raises `TransactionNotFoundError` for wrong user_id (ownership check)
- `create` persists and returns correct schema
- `update` applies partial fields only
- `delete` raises `TransactionNotFoundError` for missing/other-user transaction

---

## Critical files

| Action | File |
|--------|------|
| New | `app/errors/transaction.py` |
| Edit | `app/exception_handlers.py` |
| Edit | `app/schemas/params.py` |
| New | `app/services/transaction.py` |
| New | `app/routers/transaction.py` |
| Edit | `app/main.py` |
| New | `tests/routers/test_transactions.py` |
| New | `tests/services/test_transaction_service.py` |

---

## Verification

Run `uv run pytest tests/routers/test_transactions.py tests/services/test_transaction_service.py` after implementation.
