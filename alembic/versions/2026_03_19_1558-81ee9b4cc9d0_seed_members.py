"""seed members

Revision ID: 81ee9b4cc9d0
Revises: 6b90c5a3d39b
Create Date: 2026-03-19 15:58:35.906697

"""
from typing import Sequence, Union
from uuid import uuid4

from alembic import op
from pwdlib import PasswordHash
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81ee9b4cc9d0'
down_revision: Union[str, Sequence[str], None] = '6b90c5a3d39b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


recommended_hash = PasswordHash.recommended()

def upgrade() -> None:
    def build_user(name: str, active_status: int) -> dict:
        return dict(
            id=uuid4(),
            username=name,
            email=f"{name}@example.com",
            hashed_password=recommended_hash.hash(name),
            role="member",
            is_active=active_status,
        )

    new_users = [
        build_user("member", 1),
        build_user("inactive", 0),
    ]

    for user in new_users:
        op.execute(
            sa.text(
                """
                    INSERT INTO user (id, username, email, hashed_password, role, is_active)
                    VALUES (
                        :id,
                        :username,
                        :email,
                        :hashed_password,
                        :role,
                        :is_active
                    )
                """
            ).bindparams(**user)
        )


def downgrade() -> None:
    connection = op.get_bind()
    user_table = sa.Table("user", sa.MetaData(), autoload_with=connection)

    op.execute(user_table.delete().where(user_table.c.email.in_("member@example.com", "inactive@example.com")))
