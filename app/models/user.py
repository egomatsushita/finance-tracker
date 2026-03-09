from datetime import datetime as dt

from sqlalchemy.orm import mapped_column
from sqlalchemy.types import String, Boolean, UUID, DateTime

from models.base import Base


class User(Base):
    __tablename__ = "user"

    id = mapped_column(UUID, primary_key=True)
    username = mapped_column(String(64), nullable=False)
    email = mapped_column(String(128), nullable=False)
    hashed_password = mapped_column(String(256), nullable=False)
    disabled = mapped_column(Boolean, nullable=False)
    created = mapped_column(DateTime(timezone=True), default=dt.now, nullable=False)
    modified = mapped_column(DateTime(timezone=True), default=dt.now, onupdate=dt.now, nullable=False)
