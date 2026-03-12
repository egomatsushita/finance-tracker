from datetime import datetime as dt
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.orm import mapped_column
from sqlalchemy.types import String, Boolean, DateTime, UUID

from models.base import Base


class User(Base):
    __tablename__ = "user"

    id = mapped_column(UUID, primary_key=True, default=uuid4)
    username = mapped_column(String(64), nullable=False, unique=True)
    email = mapped_column(String(256), nullable=False, unique=True)
    hashed_password = mapped_column(String(256), nullable=False)
    is_active = mapped_column(Boolean, nullable=False, default=True)
    role = mapped_column(String(32), nullable=False, default="user")
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id!r}, email={self.email!r}, is_active={self.is_active})>"
