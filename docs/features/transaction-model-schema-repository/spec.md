# Spec for Transaction Model, Schema and Repository

branch: FT-23_transaction-model-schema-repository

## Summary

Implement the SQLAlchemy model, Pydantic schemas, and repository for the `financial_transaction` table introduced in migration `d82b574a14fc`. This covers the data layer only — no router or service logic. The model maps directly to the `financial_transaction` table. Categories are scoped per `kind`: income and expense each have a fixed set of allowed values.

## Functional Requirements

- Define a `FinancialTransaction` SQLAlchemy model in `app/models/transaction.py` mapping to the `financial_transaction` table, with columns: `id`, `amount`, `kind`, `category`, `description`, `user_id`, `transaction_date`, `created_at`, `updated_at`.
- `kind` is stored as a plain string field (matching the `transaction_kind` Postgres enum values: `"income"`, `"expense"`).
- `category` is stored as a plain string field (`String(50)`). Allowed values are validated at the schema level, not the model level.
- Define `TransactionKindEnum` (str, Enum) with values `income` and `expense`.
- Define category enums scoped by kind:
  - `IncomeCategoryEnum`: `salary`, `investment`, `rental`, `gift`, `other`
  - `ExpenseCategoryEnum`: `housing`, `utilities`, `groceries`, `transport`, `health`, `entertainment`, `education`, `clothing`, `travel`, `savings`, `other`
- Define Pydantic schemas in `app/schemas/transaction.py`:
  - `TransactionCreateSchema` — fields required to create a transaction: `amount`, `kind`, `category`, `description` (optional), `user_id`, `transaction_date`.
  - `TransactionUpdateSchema` — all fields optional, uses `exclude_unset=True` for partial updates. Does not allow changing `user_id`.
  - `TransactionReadSchema` — full read shape including `id`, `created_at`, `updated_at`.
- Category validation in schemas must enforce that the `category` value is valid for the given `kind`. This is a cross-field validation using a Pydantic validator.
- Define a `TransactionRepository` in `app/repositories/transaction.py` with async CRUD methods: `get_all`, `get_by_id`, `create`, `update`, `delete`.
- `get_all` accepts a `TransactionFilterParams` schema carrying: required `user_id`, pagination fields (`offset`, `limit`, `order_by`), and optional `kind` and `category` filters. Transactions are always user-scoped — no method exists to retrieve transactions across users.
- All repository methods follow the docstring format: description / `Args:` / `Returns:` / `Raises:`.

## Possible Edge Cases

- A `category` value that is valid for `income` is submitted with `kind = "expense"` (and vice versa). The schema validator must reject this.
- `description` is nullable — the model and schema must allow `None` explicitly.
- `amount` uses `Numeric(10, 2)` — Pydantic should accept `Decimal` with appropriate precision; avoid using `float`.
- `transaction_date` is timezone-aware — schemas should use `datetime` with `datetime(timezone=True)`.
- `user_id` is a foreign key to `user.id` (UUID) — the model must declare this relationship correctly without eager loading.

## Acceptance Criteria

- `FinancialTransaction` model is importable and maps to the `financial_transaction` table without errors.
- `TransactionCreateSchema` rejects a mismatched kind/category combination with a clear validation error.
- `TransactionCreateSchema` accepts a valid income or expense payload.
- `TransactionUpdateSchema` supports partial updates (only the provided fields are applied).
- `TransactionReadSchema` serializes all model fields including timestamps and UUID.
- `TransactionRepository.create` persists a new record and returns it with database-generated fields populated.
- `TransactionRepository.get_all` returns paginated results scoped to the given `user_id`.
- `TransactionRepository.update` applies only the fields present in the update schema.
- `TransactionRepository.delete` returns `True` on success and `False` when the record is not found.

## Open Questions

- `TransactionUpdateSchema` must include a cross-field validator: if both `kind` and `category` are provided, the category must be valid for the new kind. If only `category` is provided without `kind`, validation cannot run at the schema level — the service layer must resolve this by loading the existing `kind` from the database before validating.
- `get_all` supports optional filters for `kind` and `category` alongside the required `user_id`. A `TransactionFilterParams` schema extending `FilterParams` should carry these optional fields.
