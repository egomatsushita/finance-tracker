from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    username: str
    email: EmailStr
    disabled: bool = False


class UserCreateHashSchema(UserBase):
    hashed_password: str


class UserCreateSchema(UserBase):
    password: str


class UserUpdateSchema(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    disabled: bool | None = None
    password: str | None = None


class UserReadSchema(UserBase):
    id: UUID
    created: datetime
    modified: datetime
