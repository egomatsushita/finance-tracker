import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm

from config.settings import settings
from dependencies.auth import CurrentUserDep, VerifyCsrf
from dependencies.service import get_service_dep
from schemas.auth import LoginResponse
from services.auth import AuthService

auth_router = APIRouter(prefix="/auth")

ServiceDep = Annotated[AuthService, get_service_dep(AuthService)]

SESSION_COOKIE = "session"
CSRF_COOKIE = "csrf_token"


def _cookie_kwargs() -> dict:
    return {
        "max_age": settings.access_token_expire_minute * 60,
        "path": "/",
        "domain": settings.cookie_domain,
        "secure": settings.cookie_secure,
        "samesite": "lax",
    }


def _set_auth_cookies(response: Response, access_token: str) -> None:
    kwargs = _cookie_kwargs()
    response.set_cookie(SESSION_COOKIE, access_token, httponly=True, **kwargs)
    response.set_cookie(
        CSRF_COOKIE, secrets.token_urlsafe(32), httponly=False, **kwargs
    )


def _clear_auth_cookies(response: Response) -> None:
    for name in (SESSION_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            name, path="/", domain=settings.cookie_domain, samesite="lax"
        )


@auth_router.post("/token", include_in_schema=False)
async def login(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: ServiceDep,
) -> LoginResponse:
    """
    Authenticate with username and password to obtain a session.

    Accepts an OAuth2 passowrd form with:
    - **username**: the user's username
    - **password**: the user's password

    Sets an httpOnly `session` cookie and a readable `csrf_token` cookie.
    """
    token = await service.login(form_data)
    _set_auth_cookies(response, token.access_token)
    return LoginResponse(detail="ok")


@auth_router.post("/logout", dependencies=[VerifyCsrf], include_in_schema=False)
async def logout(response: Response, current_user: CurrentUserDep) -> LoginResponse:
    """
    Log out the current session by clearing the `session` and `csrf_token` cookies.
    """
    _clear_auth_cookies(response)
    return LoginResponse(detail="ok")
