from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

from schemas.auth import TokenPayload
from services.auth import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def verify_token(token: TokenDep) -> None:
    """
    Verify a token retrieved from `OAuth2PasswordBearer` dependency.

    Decodes the JWT and checks for the presence of `sub`.
    If `sub` exists then user has valid credentials,
    otherwise a 401 HTTP exception is raised.

    Args:
        token: The token retrieved from `OAuth2PasswordBearer` dependency

    Raises:
        HTTPException: If `sub` is missing from the decoded JWT then a 401 HTTP exception is raised.
    """
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
