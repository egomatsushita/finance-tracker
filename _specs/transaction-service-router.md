# Spec for Transaction Service and Router

branch: FT-24_transaction-service-router

## Summary

Implement the service and router layers for the financial transaction feature, completing the full Router → Service → Repository stack. The service will wrap `TransactionRepository` with business logic and error handling, while the router exposes CRUD endpoints scoped to the authenticated user. Follow the existing `UserService` and user/admin-user routers as the canonical pattern.

## Functional Requirements

- **TransactionService** wraps `TransactionRepository`, accepts `AsyncSession` in `__init__`, and exposes async methods: `get_all`, `get_by_id`, `create`, `update`, `delete`.
- All service methods return validated `TransactionReadSchema` instances (or lists thereof), never raw ORM models.
- `get_all` accepts `user_id` and `TransactionFilterParams` and delegates pagination, filtering, and ordering to the repository.
- `get_by_id` raises `TransactionNotFoundError` when no matching transaction exists for the given `transaction_id`.
- `create` accepts a `user_id` and `TransactionCreateSchema`, persists via the repository, and returns the created `TransactionReadSchema`.
- `update` accepts `transaction_id` and `TransactionUpdateSchema`, raises `TransactionNotFoundError` if the record does not exist, and returns the updated `TransactionReadSchema`.
- `delete` accepts `transaction_id` and raises `TransactionNotFoundError` if the record does not exist.
- **TransactionRouter** uses `APIRouter(prefix="/transactions", tags=["transactions"])` and requires an authenticated member user (ownership-scoped access — a user may only manage their own transactions).
- The router exposes: `GET /`, `POST /`, `GET /{transaction_id}`, `PUT /{transaction_id}`, `DELETE /{transaction_id}`.
- `GET /` accepts `TransactionFilterParams` as query parameters and returns a list of `TransactionReadSchema`.
- `POST /` accepts `TransactionCreateSchema` and returns `TransactionReadSchema` with HTTP 201.
- `GET /{transaction_id}` returns `TransactionReadSchema` or raises `TransactionNotFoundError`.
- `PUT /{transaction_id}` accepts `TransactionUpdateSchema` and returns `TransactionReadSchema`.
- `DELETE /{transaction_id}` returns HTTP 204 with no body.
- A new `TransactionNotFoundError` domain exception must be added to `app/errors/` and registered in `app/exception_handlers.py` (mapped to HTTP 404).
- The router must enforce that users can only access their own transactions. Pass the authenticated `user_id` (from the token) into service calls so the repository filters by owner.
- Register the new router in `app/main.py` (or the central router registry).

## Possible Edge Cases

- Attempt to read, update, or delete a transaction that belongs to a different user — should return 404 (not 403) to avoid leaking existence of other users' records.
- Update request with no fields set — `TransactionUpdateSchema` uses `model_dump(exclude_unset=True)`; the service should apply no changes but still return the existing record.
- `amount` of zero or negative values — already guarded by the schema validator, but the service should not add a second layer of validation.
- Category that does not match `kind` on an update — already validated in `TransactionUpdateSchema`; the service receives a valid schema.
- Providing both `date_from` and `date_to` where `date_from > date_to` — `TransactionFilterParams` must validate this with a `@model_validator` and raise a `ValueError`, which Pydantic will surface as HTTP 422.

## Acceptance Criteria

- `TransactionService` exists at `app/services/transaction.py` and follows the same structure as `UserService`.
- `TransactionNotFoundError` exists in `app/errors/` and is mapped to HTTP 404 in `app/exception_handlers.py`.
- The transaction router exists at `app/routers/transaction.py` and is registered in the application.
- Authenticated members can create, read, update, and delete only their own transactions.
- Unauthenticated requests to any transaction endpoint return HTTP 401.
- Requests for a transaction that does not exist (or belongs to another user) return HTTP 404.
- `GET /transactions/` supports filtering by `kind`, `category`, `date_from`, `date_to`, and ordering/pagination via `TransactionFilterParams`.
- `DELETE /transactions/{transaction_id}` returns HTTP 204 with an empty body.
- All service methods include structured docstrings: description / `Args:` / `Returns:` / `Raises:`.

## Open Questions


## Testing Guidelines

Create `tests/routers/test_transactions.py` and `tests/services/test_transaction_service.py`. Cover the following cases without going too heavy:

- `GET /transactions/` returns only the authenticated user's transactions.
- `GET /transactions/` with `kind`, `category`, and date range filters returns the correct subset.
- `POST /transactions/` with valid payload creates and returns the new transaction (HTTP 201).
- `POST /transactions/` with invalid payload (e.g., mismatched kind/category) returns HTTP 422.
- `GET /transactions/{id}` returns the transaction for its owner.
- `GET /transactions/{id}` returns HTTP 404 for a non-existent or another user's transaction.
- `PUT /transactions/{id}` with valid partial data updates only the supplied fields.
- `PUT /transactions/{id}` on a non-existent transaction returns HTTP 404.
- `DELETE /transactions/{id}` returns HTTP 204 and the transaction no longer exists.
- `DELETE /transactions/{id}` on a non-existent transaction returns HTTP 404.
- Unauthenticated request to any endpoint returns HTTP 401.
