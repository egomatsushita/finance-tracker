import secrets
from datetime import timedelta

from fastapi import Response

from config.settings import settings
from services.auth import AuthService

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


def set_auth_cookies(response: Response, access_token: str) -> None:
    """
    Set the `session` and `csrf_token` cookies for a given access token.
    Args:
        response: The outgoing response to attach cookies to.
        access_token: A signed JWT whose `exp` must match
                      `settings.access_token_expire_minute`, the same value
                      used for the cookies' `max_age` here.
    """
    kwargs = _cookie_kwargs()
    response.set_cookie(SESSION_COOKIE, access_token, httponly=True, **kwargs)
    response.set_cookie(
        CSRF_COOKIE, secrets.token_urlsafe(32), httponly=False, **kwargs
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Clear the `session` and `csrf_token` cookies.
    Args:
        response: The outgoing response to clear cookies on.
    """
    for name in (SESSION_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            name, path="/", domain=settings.cookie_domain, samesite="lax"
        )


def issue_session(response: Response, username: str) -> None:
    """
    Mint a fresh access token for `username` and set it as the session.
    Args:
        response: The outgoing response to attach cookies to.
        username: The subject to encode in the new JWT.
    """
    expires_delta = timedelta(minutes=settings.access_token_expire_minute)
    access_token = AuthService.create_access_token(username, expires_delta)
    set_auth_cookies(response, access_token)
