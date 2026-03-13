"""seed admin user

Revision ID: 6b90c5a3d39b
Revises: 9c25eea42330
Create Date: 2026-03-13 09:12:46.417542

"""

from typing import Sequence, Union
from uuid import uuid4

from alembic import op
from pwdlib import PasswordHash
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6b90c5a3d39b"
down_revision: Union[str, Sequence[str], None] = "9c25eea42330"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

recommended_hash = PasswordHash.recommended()


def upgrade() -> None:
    op.execute(
        sa.text(
            """
                INSERT INTO user (id, username, email, hashed_password, role, is_active)
                VALUES (
                    :id,
                    'admin',
                    'admin@example.com',
                    :hashed_password,
                    "admin",
                    1
                )
            """
        ).bindparams(id=uuid4(), hashed_password=recommended_hash.hash("admin"))
    )


def downgrade() -> None:
    connection = op.get_bind()
    user_table = sa.Table("user", sa.MetaData(), autoload_with=connection)

    op.execute(user_table.delete().where(user_table.c.email == "admin@example.com"))
