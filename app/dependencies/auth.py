import secrets
from typing import Annotated
from uuid import UUID

from fastapi import Cookie, Depends, Request
from jwt.exceptions import InvalidTokenError

from dependencies.database import SessionDep
from errors.auth import CredentialError, CsrfError, ForbiddenError
from errors.user import UserNotFoundError
from schemas.auth import TokenPayload
from schemas.user import CurrentUser, UserRoleEnum
from services.auth import AuthService
from services.user import UserService

SessionCookie = Annotated[str | None, Cookie(alias="session")]


def _require_session_token(session: SessionCookie = None) -> str:
    """
    Require the JWT from the `session` cookie.
    Args:
        session: The raw JWT read from the `session` cookie, if present.
    Returns:
        The raw JWT string.
    Raises:
        CredentialError: If the `session` cookie is missing.
    """
    if session is None:
        raise CredentialError()
    return session


TokenDep = Annotated[str, Depends(_require_session_token)]


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


async def verify_csrf(request: Request, current_user: CurrentUserDep) -> None:
    """
    Verify the X-CSRF-Token header matches the csrf_token cookie
    (double-submit CSRF check for mutating requests).
    Args:
        request: The incoming request.
        current_user: The authenticated caller resolved by get_current_user,
                       required here so an unauthenticated request raises
                       401 before this CSRF check can raise 403.
    Raises:
        CsrfError: If either value is missing or they don't match.
    """
    cookie_value = request.cookies.get("csrf_token")
    header_value = request.headers.get("x-csrf-token")
    if (
        not cookie_value
        or not header_value
        or not secrets.compare_digest(cookie_value, header_value)
    ):
        raise CsrfError()


VerifyCsrf = Depends(verify_csrf)
