from datetime import datetime

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginResponse(BaseModel):
    detail: str


class TokenPayload(BaseModel):
    sub: str | None = None
    exp: datetime
