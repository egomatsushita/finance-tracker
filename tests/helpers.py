from dataclasses import dataclass


@dataclass(frozen=True)
class AuthCookies:
    session: str
    csrf: str


def auth_kwargs(auth: AuthCookies, csrf: bool = False) -> dict:
    """
    Build cookies=/headers= kwargs for an authenticated httpx request.
    Args:
        auth: The session/CSRF cookie values for the authenticated user.
        csrf: Whether the request is mutating and needs the CSRF header.
    Returns:
        A dict to unpack into an httpx client call (cookies=, headers=).
    """
    cookies = {"session": auth.session}
    kwargs: dict = {"cookies": cookies}
    if csrf:
        cookies["csrf_token"] = auth.csrf
        kwargs["headers"] = {"X-CSRF-Token": auth.csrf}
    return kwargs
