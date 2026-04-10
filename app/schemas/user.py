from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import ConfigDict, EmailStr

from schemas.base import Base


class UserRoleEnum(str, Enum):
    """
    admin - has full access to all users resources (create, read, update and delete)
    member - can only read and update their own profile
    """

    admin = "admin"
    member = "member"


class UserBase(Base):
    username: str
    email: EmailStr
    is_active: bool = True
    role: UserRoleEnum = UserRoleEnum.member


class UserCreateHashSchema(UserBase):
    hashed_password: str


class UserCreateSchema(UserBase):
    password: str


class UserUpdateBaseSchema(Base):
    username: str | None = None
    email: EmailStr | None = None
    role: UserRoleEnum | None = None
    is_active: bool | None = None


class UserUpdateAdminSchema(UserUpdateBaseSchema):
    password: str | None = None


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
    role: UserRoleEnum
