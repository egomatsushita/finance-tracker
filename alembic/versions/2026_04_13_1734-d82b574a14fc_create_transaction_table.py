"""create transaction table

Revision ID: d82b574a14fc
Revises: 81ee9b4cc9d0
Create Date: 2026-04-13 17:34:46.638038

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d82b574a14fc"
down_revision: Union[str, Sequence[str], None] = "81ee9b4cc9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    kind_enum = sa.Enum("income", "expense", name="transaction_kind")
    kind_enum.create(op.get_bind())

    op.create_table(
        "financial_transaction",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("income", "expense", name="transaction_kind"),
            nullable=False,
        ),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("user_id", sa.UUID, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("transaction_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("financial_transaction")
    sa.Enum(name="transaction_kind").drop(op.get_bind())
