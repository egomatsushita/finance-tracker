from uuid import uuid4

from httpx import AsyncClient


async def test_get_user_not_found(client: AsyncClient, admin_token: str):
    response = await client.get(
        f"/users/{uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


async def test_get_user_unauthenticated(client: AsyncClient):
    response = await client.get(f"/users/{uuid4()}")
    assert response.status_code == 401


async def test_member_can_read_own_profile(
    client: AsyncClient, member_token: str, member_user
):
    response = await client.get(
        f"/users/{member_user.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 200
    assert response.json()["username"] == "member"


async def test_member_cannot_read_other_user(
    client: AsyncClient, member_token: str, admin_user
):
    response = await client.get(
        f"/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 403


async def test_member_can_update_own_profile(
    client: AsyncClient, member_token: str, member_user
):
    response = await client.put(
        f"/users/{member_user.id}",
        json={"username": "member"},
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 200


async def test_member_cannot_update_other_user(
    client: AsyncClient, member_token: str, admin_user
):
    response = await client.put(
        f"/users/{admin_user.id}",
        json={"username": "hacked"},
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 403


async def test_member_cannot_self_escalate_role(
    client: AsyncClient, member_token: str, member_user
):
    response = await client.put(
        f"/users/{member_user.id}",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 422


async def test_member_cannot_send_is_active(
    client: AsyncClient, member_token: str, member_user
):
    response = await client.put(
        f"/users/{member_user.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 422
