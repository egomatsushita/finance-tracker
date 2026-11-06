"""drop user role

Revision ID: f3a6c1b9d2e4
Revises: d82b574a14fc
Create Date: 2026-11-06 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f3a6c1b9d2e4"
down_revision: Union[str, Sequence[str], None] = "d82b574a14fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("user", "role")


def downgrade() -> None:
    op.add_column(
        "user",
        sa.Column("role", sa.String(32), nullable=False, server_default="user"),
    )
