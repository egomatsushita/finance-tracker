from datetime import datetime, timezone

from helpers import AuthCookies, auth_kwargs
from httpx import AsyncClient

from services.auth import AuthService


async def test_login_valid(client: AsyncClient, admin_user):
    response = await client.post(
        "/auth/token",
        data={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    assert response.json() == {"detail": "ok"}

    session_cookie = next(c for c in response.cookies.jar if c.name == "session")
    csrf_cookie = next(c for c in response.cookies.jar if c.name == "csrf_token")
    assert session_cookie.has_nonstandard_attr("HttpOnly")
    assert not csrf_cookie.has_nonstandard_attr("HttpOnly")


async def test_login_wrong_password(client: AsyncClient, admin_user):
    response = await client.post(
        "/auth/token",
        data={"username": "admin", "password": "wrong"},
    )
    assert response.status_code == 401


async def test_login_unknown_user(client: AsyncClient):
    response = await client.post(
        "/auth/token",
        data={"username": "nobody", "password": "x"},
    )
    assert response.status_code == 401


async def test_invalid_token(client: AsyncClient):
    response = await client.get(
        "/admin/users/",
        cookies={"session": "not-a-valid-token"},
    )
    assert response.status_code == 401


async def test_expired_token(client: AsyncClient):
    token = AuthService.encode_jwt(
        {"sub": "admin", "exp": datetime(2000, 1, 1, tzinfo=timezone.utc)}
    )
    response = await client.get(
        "/admin/users/",
        cookies={"session": token},
    )
    assert response.status_code == 401


async def test_token_missing_sub(client: AsyncClient):
    token = AuthService.encode_jwt({"exp": datetime(2100, 1, 1, tzinfo=timezone.utc)})
    response = await client.get(
        "/admin/users/",
        cookies={"session": token},
    )
    assert response.status_code == 401


async def test_missing_session_cookie(client: AsyncClient):
    response = await client.get("/admin/users/")
    assert response.status_code == 401


async def test_logout_clears_cookies(client: AsyncClient, member_user):
    # Use a fresh login (not the shared member_token fixture) so clearing
    # cookies here doesn't affect other tests sharing the session-scoped client.
    login_response = await client.post(
        "/auth/token", data={"username": "member", "password": "member"}
    )
    fresh_token = AuthCookies(
        session=login_response.cookies["session"],
        csrf=login_response.cookies["csrf_token"],
    )

    response = await client.post("/auth/logout", **auth_kwargs(fresh_token, csrf=True))
    assert response.status_code == 200

    set_cookie_headers = response.headers.get_list("set-cookie")
    assert any(
        h.startswith("session=;") or 'session=""' in h for h in set_cookie_headers
    )
    assert any(
        h.startswith("csrf_token=;") or 'csrf_token=""' in h for h in set_cookie_headers
    )

    # Rely on the client's own cookie jar (not a manually re-supplied cookie):
    # logout only clears the browser-side cookie, it doesn't revoke the
    # stateless JWT itself, so resending the old token manually would still
    # authenticate. The real guarantee is that the browser no longer has it.
    stale_check = await client.get("/users/me")
    assert stale_check.status_code == 401


async def test_csrf_missing_header_rejected(
    client: AsyncClient, member_token: AuthCookies
):
    response = await client.post(
        "/transactions/",
        cookies={"session": member_token.session},
        json={
            "amount": "10.00",
            "kind": "income",
            "category": "salary",
            "transaction_date": "2026-01-01",
        },
    )
    assert response.status_code == 403


async def test_csrf_mismatched_header_rejected(
    client: AsyncClient, member_token: AuthCookies
):
    response = await client.post(
        "/transactions/",
        cookies={"session": member_token.session, "csrf_token": member_token.csrf},
        headers={"X-CSRF-Token": "not-the-right-value"},
        json={
            "amount": "10.00",
            "kind": "income",
            "category": "salary",
            "transaction_date": "2026-01-01",
        },
    )
    assert response.status_code == 403


async def test_csrf_valid_header_accepted(
    client: AsyncClient, member_token: AuthCookies
):
    response = await client.post(
        "/transactions/",
        **auth_kwargs(member_token, csrf=True),
        json={
            "amount": "10.00",
            "kind": "income",
            "category": "salary",
            "transaction_date": "2026-01-01",
        },
    )
    assert response.status_code == 201

    # member_user is a session-scoped fixture shared with other test files
    # (e.g. test_transaction_summary.py assumes it starts with zero
    # transactions) — clean up this side effect so it doesn't leak.
    transaction_id = response.json()["id"]
    delete_response = await client.delete(
        f"/transactions/{transaction_id}",
        **auth_kwargs(member_token, csrf=True),
    )
    assert delete_response.status_code == 204
