from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

from schemas.auth import TokenPayload
from services.auth import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def verify_token(token: TokenDep) -> None:
    credential_exception = HTTPException(
        status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = AuthService.decode_jwt(token)
        token_payload = TokenPayload.model_validate(payload)
        username = token_payload.sub
        if username is None:
            raise credential_exception
    except InvalidTokenError:
        raise credential_exception
