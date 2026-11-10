"""seed member transactions

Revision ID: a1b2c3d4e5f6
Revises: f3a6c1b9d2e4
Create Date: 2026-11-10 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f3a6c1b9d2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_MARKER = "overview-page-seed"

MONTHS = [
    ("2026-01", 1),
    ("2026-02", 2),
    ("2026-03", 3),
]

# amount, category, day-of-month, description
EXPENSES_BY_MONTH = {
    1: [
        ("1150.00", "housing", 2),
        ("140.00", "utilities", 3),
        ("320.00", "groceries", 6),
        ("110.00", "transport", 8),
        ("75.00", "health", 12),
        ("85.00", "entertainment", 15),
        ("300.00", "savings", 1),
        ("55.00", "other", 20),
    ],
    2: [
        ("1150.00", "housing", 2),
        ("135.00", "utilities", 3),
        ("360.00", "groceries", 7),
        ("95.00", "transport", 9),
        ("40.00", "health", 14),
        ("120.00", "entertainment", 18),
        ("300.00", "savings", 1),
        ("30.00", "other", 22),
    ],
    3: [
        ("1150.00", "housing", 2),
        ("150.00", "utilities", 4),
        ("340.00", "groceries", 5),
        ("130.00", "transport", 10),
        ("60.00", "health", 11),
        ("100.00", "entertainment", 16),
        ("300.00", "savings", 1),
        ("45.00", "other", 19),
    ],
}

INCOME_BY_MONTH = {
    1: [("3200.00", "salary", 1)],
    2: [("3200.00", "salary", 1)],
    3: [("3200.00", "salary", 1), ("150.00", "investment", 15)],
}


def upgrade() -> None:
    connection = op.get_bind()
    member_id = connection.execute(
        sa.text("SELECT id FROM user WHERE username = 'member'")
    ).scalar()
    if member_id is None:
        return

    rows = []
    for month_str, month_num in MONTHS:
        for amount, category, day in EXPENSES_BY_MONTH[month_num]:
            rows.append(
                dict(
                    id=None,
                    amount=amount,
                    kind="expense",
                    category=category,
                    description=SEED_MARKER,
                    user_id=member_id,
                    transaction_date=f"{month_str}-{day:02d}T09:00:00",
                )
            )
        for amount, category, day in INCOME_BY_MONTH[month_num]:
            rows.append(
                dict(
                    id=None,
                    amount=amount,
                    kind="income",
                    category=category,
                    description=SEED_MARKER,
                    user_id=member_id,
                    transaction_date=f"{month_str}-{day:02d}T09:00:00",
                )
            )

    for row in rows:
        op.execute(
            sa.text(
                """
                    INSERT INTO financial_transaction
                        (amount, kind, category, description, user_id, transaction_date)
                    VALUES
                        (:amount, :kind, :category, :description, :user_id, :transaction_date)
                """
            ).bindparams(
                amount=row["amount"],
                kind=row["kind"],
                category=row["category"],
                description=row["description"],
                user_id=row["user_id"],
                transaction_date=row["transaction_date"],
            )
        )


def downgrade() -> None:
    connection = op.get_bind()
    transaction_table = sa.Table(
        "financial_transaction", sa.MetaData(), autoload_with=connection
    )
    op.execute(
        transaction_table.delete().where(transaction_table.c.description == SEED_MARKER)
    )
