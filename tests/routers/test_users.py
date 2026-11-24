from datetime import datetime, timezone
from uuid import uuid4

from helpers import AuthCookies, auth_kwargs
from httpx import AsyncClient

from config.settings import settings
from services.auth import AuthService


async def test_get_user_unauthenticated(client: AsyncClient):
    response = await client.get(f"/users/{uuid4()}")
    assert response.status_code == 401


async def test_member_can_read_own_profile(
    client: AsyncClient, member_token: AuthCookies, member_user
):
    response = await client.get(
        f"/users/{member_user.id}",
        **auth_kwargs(member_token),
    )
    assert response.status_code == 200
    assert response.json()["username"] == "member"


async def test_member_cannot_read_other_user(
    client: AsyncClient, member_token: AuthCookies, admin_user
):
    response = await client.get(
        f"/users/{admin_user.id}",
        **auth_kwargs(member_token),
    )
    assert response.status_code == 403


async def test_member_can_update_own_profile(
    client: AsyncClient, member_token: AuthCookies, member_user
):
    response = await client.put(
        f"/users/{member_user.id}",
        json={"username": "member"},
        **auth_kwargs(member_token, csrf=True),
    )
    assert response.status_code == 200


async def test_member_cannot_update_other_user(
    client: AsyncClient, member_token: AuthCookies, admin_user
):
    response = await client.put(
        f"/users/{admin_user.id}",
        json={"username": "hacked"},
        **auth_kwargs(member_token, csrf=True),
    )
    assert response.status_code == 403


async def test_member_cannot_send_is_active(
    client: AsyncClient, member_token: AuthCookies, member_user
):
    response = await client.put(
        f"/users/{member_user.id}",
        json={"is_active": False},
        **auth_kwargs(member_token, csrf=True),
    )
    assert response.status_code == 422


async def test_member_can_read_own_profile_via_me(
    client: AsyncClient, member_token: AuthCookies, member_user
):
    response = await client.get(
        "/users/me",
        **auth_kwargs(member_token),
    )
    assert response.status_code == 200
    assert response.json()["username"] == "member"
    assert response.json()["id"] == str(member_user.id)


async def test_admin_can_read_own_profile_via_me(
    client: AsyncClient, admin_token: AuthCookies
):
    response = await client.get(
        "/users/me",
        **auth_kwargs(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["username"] == "admin"


async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/users/me")
    assert response.status_code == 401


async def test_renaming_self_does_not_invalidate_the_session(client: AsyncClient):
    signup_response = await client.post(
        "/auth/signup",
        json={
            "username": "renamer",
            "email": "renamer@example.com",
            "password": "renamerpassword",
        },
    )
    old_session = signup_response.cookies["session"]
    old_csrf = signup_response.cookies["csrf_token"]

    me_response = await client.get("/users/me", cookies={"session": old_session})
    user_id = me_response.json()["id"]

    update_response = await client.put(
        f"/users/{user_id}",
        json={"username": "renamed"},
        cookies={"session": old_session, "csrf_token": old_csrf},
        headers={"X-CSRF-Token": old_csrf},
    )
    assert update_response.status_code == 200

    new_session = update_response.cookies["session"]
    new_csrf = update_response.cookies["csrf_token"]
    assert new_session != old_session
    assert new_csrf != old_csrf

    me_after_rename = await client.get("/users/me", cookies={"session": new_session})
    assert me_after_rename.status_code == 200
    assert me_after_rename.json()["username"] == "renamed"

    # Regression guard: the new token's exp must match the cookie's max_age
    # (settings.access_token_expire_minute), not AuthService's internal
    # hardcoded default -- otherwise the cookie would outlive the JWT and
    # the session would die silently before the cookie expires.
    payload = AuthService.decode_jwt(new_session)
    expires_in = datetime.fromtimestamp(payload["exp"], tz=timezone.utc) - datetime.now(
        timezone.utc
    )
    expected_minutes = settings.access_token_expire_minute
    assert expected_minutes - 1 <= expires_in.total_seconds() / 60 <= expected_minutes
