from uuid import uuid4

from httpx import AsyncClient


async def test_list_users_authenticated(
    client: AsyncClient, admin_token: str, admin_user
):
    response = await client.get(
        "/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_list_users_no_token(client: AsyncClient):
    response = await client.get("/users/")
    assert response.status_code == 401


async def test_create_user_valid(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "password123",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == f"user_{suffix}"
    assert body["email"] == f"user_{suffix}@example.com"


async def test_create_user_duplicate_email(
    client: AsyncClient, admin_token: str, admin_user
):
    response = await client.post(
        "/users/",
        json={
            "username": "other_admin",
            "email": "admin@example.com",
            "password": "password123",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 409


async def test_create_user_duplicate_username(
    client: AsyncClient, admin_token: str, admin_user
):
    response = await client.post(
        "/users/",
        json={
            "username": "admin",
            "email": "other@example.com",
            "password": "password123",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 409


async def test_get_user_not_found(client: AsyncClient, admin_token: str):
    response = await client.get(
        f"/users/{uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


async def test_get_user_found(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    create_response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "password123",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]

    response = await client.get(
        f"/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == user_id


async def test_delete_user(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    create_response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "password123",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]

    delete_response = await client.delete(
        f"/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert delete_response.status_code == 204

    get_response = await client.get(
        f"/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_response.status_code == 404
