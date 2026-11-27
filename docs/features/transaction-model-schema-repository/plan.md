# Plan: Transaction Model, Schema and Repository (FT-23)

## Context

The `financial_transaction` table was added in migration `d82b574a14fc`. This plan implements the data layer (model, schemas, repository) to match that table. No router or service is in scope.

---

## Implementation Order

Files must be created in this order to avoid import errors:

1. `app/models/transaction.py`
2. `app/schemas/transaction.py`
3. `app/schemas/params.py` (modify)
4. `app/repositories/transaction.py`

---

## Step 1 — `app/models/transaction.py` (create)

Mirror `app/models/user.py` exactly. Key decisions:
- `id`: `Integer`, PK, `autoincrement=True` — no Python-side default, DB handles it
- `kind`: `sa.Enum("income", "expense", name="transaction_kind", create_type=False)` — matches the Postgres enum created in the migration; `create_type=False` prevents SA from attempting to recreate the type during `metadata.create_all()` (e.g. in tests)
- `user_id`: `UUID` with `ForeignKey("user.id")` — FK column only, no relationship object
- `amount`: `Numeric(10, 2)`
- `description`: `String(255), nullable=True`
- Timestamps: `created_at` with `server_default=func.now()`; `updated_at` with both `server_default=func.now()` and `onupdate=func.now()`

```python
import sqlalchemy as sa
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import mapped_column
from sqlalchemy.types import Integer, DateTime, Numeric, UUID

from models.base import Base

class FinancialTransaction(Base):
    """Represents a financial transaction recorded by a user."""
    __tablename__ = "financial_transaction"
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    amount = mapped_column(Numeric(10, 2), nullable=False)
    kind = mapped_column(sa.Enum("income", "expense", name="transaction_kind", create_type=False), nullable=False)
    category = mapped_column(String(50), nullable=False)
    description = mapped_column(String(255), nullable=True)
    user_id = mapped_column(UUID, ForeignKey("user.id"), nullable=False)
    transaction_date = mapped_column(DateTime(timezone=True), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    def __repr__(self):
        return f"<FinancialTransaction(id={self.id!r}, kind={self.kind!r}, amount={self.amount!r})>"
```

---

## Step 2 — `app/schemas/transaction.py` (create)

Define enums, a shared base, and create/update/read schemas with cross-field validators.

**Enums** — all `str, Enum`:
- `TransactionKindEnum`: `income`, `expense`
- `IncomeCategoryEnum`: `salary`, `investment`, `rental`, `gift`, `other`
- `ExpenseCategoryEnum`: `housing`, `utilities`, `groceries`, `transport`, `health`, `entertainment`, `education`, `clothing`, `travel`, `savings`, `other`

**Module-level lookup** (also ensures both category enums are "used" for Ruff):
```python
_VALID_CATEGORIES: dict[TransactionKindEnum, set[str]] = {
    TransactionKindEnum.income: {c.value for c in IncomeCategoryEnum},
    TransactionKindEnum.expense: {c.value for c in ExpenseCategoryEnum},
}
```

**`TransactionBase(schemas.base.Base)`** — shared fields: `amount: Decimal`, `kind: TransactionKindEnum`, `category: str`, `description: str | None = None`, `user_id: UUID`, `transaction_date: datetime`

**`TransactionCreateSchema(TransactionBase)`** — adds `@model_validator(mode="after")` that checks `self.category` against `_VALID_CATEGORIES[self.kind]`.

**`TransactionUpdateSchema(schemas.base.Base)`** — all fields optional, no `user_id`; same validator fires **only when both** `kind` and `category` are non-`None`.

**`TransactionReadSchema(TransactionBase)`** — adds `id: int`, `created_at: datetime`, `updated_at: datetime`.

---

## Step 3 — `app/schemas/params.py` (modify)

Add `TransactionFilterParams` extending `FilterParams`. Add `UUID` import and `TransactionKindEnum` import from `schemas.transaction`.

```python
from uuid import UUID
from schemas.transaction import TransactionKindEnum

class TransactionFilterParams(FilterParams):
    user_id: UUID
    kind: TransactionKindEnum | None = None
    category: str | None = None
```

No circular import risk — `schemas.transaction` only imports from `schemas.base` and stdlib.

---

## Step 4 — `app/repositories/transaction.py` (create)

Mirror `app/repositories/user.py`. All methods are async, use `AsyncSession`, structured docstrings.

- **`get_all(filter_params: TransactionFilterParams)`**: builds `select(FinancialTransaction)`, always adds `.where(user_id == filter_params.user_id)`, conditionally adds `.where(kind == filter_params.kind.value)` and `.where(category == filter_params.category)` when non-`None`, then applies `offset` / `limit` / `order_by(text(...))`.
- **`get_by_id(transaction_id: int)`**: `session.get(FinancialTransaction, transaction_id)`
- **`create(data: TransactionCreateSchema)`**: `FinancialTransaction(**data.model_dump())`, `add`, `flush`, return instance
- **`update(transaction_id: int, data: TransactionUpdateSchema)`**: `get_by_id` → setattr loop over `model_dump(exclude_unset=True)` → `flush` → `refresh`
- **`delete(transaction_id: int)`**: `get_by_id` → `delete` → return `True` / `False`

Note: `filter_params.kind` is a `TransactionKindEnum` instance; comparing it directly to the SA Enum column works — SQLAlchemy accepts both the enum member and its string value.

---

## Verification

After implementation, run the app and confirm no import errors:
```bash
uv run python -c "from repositories.transaction import TransactionRepository; print('OK')"
```
