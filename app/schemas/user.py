from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, EmailStr

from schemas.base import Base


class UserBase(Base):
    username: str
    email: EmailStr
    is_active: bool = True


class UserCreateHashSchema(UserBase):
    hashed_password: str


class UserCreateSchema(UserBase):
    password: str


class UserUpdateBaseSchema(Base):
    username: str | None = None
    email: EmailStr | None = None


class UserUpdateHashSchema(UserUpdateBaseSchema):
    hashed_password: str | None = None


class UserUpdateSelfSchema(Base):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None


class UserReadSchema(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class CurrentUser(Base):
    id: UUID
