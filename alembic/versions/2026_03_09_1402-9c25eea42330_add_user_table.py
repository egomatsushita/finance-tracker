"""add user table

Revision ID: 9c25eea42330
Revises:
Create Date: 2026-03-09 14:02:04.694073

"""

from datetime import datetime as dt
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c25eea42330"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.UUID, primary_key=True),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("email", sa.String(128), nullable=False),
        sa.Column("hashed_password", sa.String(254), nullable=False),
        sa.Column("disabled", sa.Boolean(), nullable=False),
        sa.Column("created", sa.DateTime(), default=dt.now, nullable=False),
        sa.Column("modified", sa.DateTime(), default=dt.now, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user")
