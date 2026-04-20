# Plan: Transaction Table Migration (FT-22)

## Context

Adding the `financial_transaction` table to the database as the first step toward financial transaction tracking. This migration establishes the schema, enum type, and FK constraint. No model, service, or router is created in this task — migration only.

---

## Step 1 — Generate the migration file

```bash
uv run alembic revision -m "create transaction table"
```

This creates `alembic/versions/YYYY_MM_DD_HHMM-<hash>_create_transaction_table.py`. The content is then written manually.

---

## Step 2 — Implement `upgrade()`

**Critical files:**
- New migration file in `alembic/versions/`
- Reference: `alembic/versions/2026_03_09_1402-9c25eea42330_add_user_table.py`

**`down_revision`** must point to the last migration: `"81ee9b4cc9d0"` (seed_members).

The `upgrade()` body:

1. **Create the enum type** explicitly (required for PostgreSQL):
   ```python
   kind_enum = sa.Enum("income", "expense", name="transaction_kind")
   kind_enum.create(op.get_bind())
   ```

2. **Create the `financial_transaction` table** via `op.create_table(...)`:
   - `id`: `sa.BigInteger`, primary key, `autoincrement=True`
   - `amount`: `sa.Numeric(10, 2)`, `nullable=False`
   - `kind`: `sa.Enum("income", "expense", name="transaction_kind")`, `nullable=False`
   - `category`: `sa.String(50)`, `nullable=False`
   - `description`: `sa.String(255)`, `nullable=True`
   - `user_id`: `sa.UUID`, `sa.ForeignKey("user.id")`, `nullable=False`
   - `transaction_date`: `sa.DateTime(timezone=True)`, `nullable=False`
   - `created_at`: `sa.DateTime(timezone=True)`, `nullable=False`, `server_default=sa.func.now()`
   - `updated_at`: `sa.DateTime(timezone=True)`, `nullable=False`, `server_default=sa.func.now()`

---

## Step 3 — Implement `downgrade()`

In reverse order:
1. Drop the table: `op.drop_table("financial_transaction")`
2. Drop the enum type: `sa.Enum(name="transaction_kind").drop(op.get_bind())`

---

## Verification

```bash
# Apply the migration
uv run alembic upgrade head

# Check it applied
uv run alembic current

# Roll back
uv run alembic downgrade -1
```
