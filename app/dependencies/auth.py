from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

from errors.auth import CredentialError
from schemas.auth import TokenPayload
from services.auth import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def verify_token(token: TokenDep) -> None:
    """
    Decode and validate a JWT, extracting the `sub` claim as a `TokenPayload`.
    Args:
        token: A raw JWT string.
    Raises:
        CredentialError: If the token is invalid or `sub` is missing.
    """
    try:
        payload = AuthService.decode_jwt(token)
        token_payload = TokenPayload.model_validate(payload)
        username = token_payload.sub
        if username is None:
            raise CredentialError()
    except InvalidTokenError:
        raise CredentialError()
