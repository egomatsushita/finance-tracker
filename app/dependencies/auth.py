from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

from dependencies.database import SessionDep
from errors.auth import CredentialError, ForbiddenError
from errors.user import UserNotFoundError
from schemas.auth import TokenPayload
from schemas.user import CurrentUser, UserRoleEnum
from services.auth import AuthService
from services.user import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]


def _decode_username(token: str) -> str:
    """
    Decode a JWT and extract the username from the `sub` claim.
    Args:
        token: A raw JWT string.
    Returns:
        The username stored in the `sub` claim.
    Raises:
        CredentialError: If the token is invalid or `sub` is missing.
    """
    try:
        payload = AuthService.decode_jwt(token)
        token_payload = TokenPayload.model_validate(payload)
        username = token_payload.sub
        if username is None:
            raise CredentialError()
        return username
    except InvalidTokenError:
        raise CredentialError()


async def verify_token(token: TokenDep) -> None:
    """
    Decode and validate a JWT.
    Args:
        token: A raw JWT string.
    """
    _decode_username(token)


async def get_current_user(token: TokenDep, session: SessionDep) -> CurrentUser:
    """
    Decode a JWT and load the corresponding user from the database.
    Args:
        token: A raw JWT string.
        session: An active async database session.
    Returns:
        A CurrentUser instance carrying the user's id and role.
    Raises:
        CredentialError: If the token is invalid, `sub` is missing,
                         or the user no longer exists in the database.
    """
    username = _decode_username(token)
    service = UserService(session)
    try:
        user = await service.get_by_username(username)
    except UserNotFoundError:
        raise CredentialError()
    return CurrentUser(id=user.id, role=user.role)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def verify_admin(current_user: CurrentUserDep) -> None:
    """
    Verify the caller has the admin role.
    Args:
        current_user: The authenticated caller resolved by get_current_user.
    Raises:
        ForbiddenError: If the caller's role is not admin.
    """
    if current_user.role != UserRoleEnum.admin:
        raise ForbiddenError()


RequireAdmin = Depends(verify_admin)


async def verify_ownership(user_id: UUID, current_user: CurrentUserDep) -> None:
    """
    Verify the caller is the resource owner or an admin.
    Args:
        user_id: The UUID of the target resource, injected from the path parameter.
        current_user: The authenticated caller resolved by get_current_user.
    Raises:
        ForbiddenError: If the caller is not the owner and not an admin.
    """
    if current_user.role != UserRoleEnum.admin and current_user.id != user_id:
        raise ForbiddenError()


VerifyOwnership = Depends(verify_ownership)
