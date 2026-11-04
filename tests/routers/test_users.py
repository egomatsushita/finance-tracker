from uuid import uuid4

from helpers import AuthCookies, auth_kwargs
from httpx import AsyncClient


async def test_get_user_not_found(client: AsyncClient, admin_token: AuthCookies):
    response = await client.get(
        f"/users/{uuid4()}",
        **auth_kwargs(admin_token),
    )
    assert response.status_code == 404


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


async def test_member_cannot_self_escalate_role(
    client: AsyncClient, member_token: AuthCookies, member_user
):
    response = await client.put(
        f"/users/{member_user.id}",
        json={"role": "admin"},
        **auth_kwargs(member_token, csrf=True),
    )
    assert response.status_code == 422


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
