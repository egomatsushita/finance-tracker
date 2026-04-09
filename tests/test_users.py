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


async def test_list_users_offset_negative(client: AsyncClient, admin_token: str):
    response = await client.get(
        "/users/?offset=-1",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_list_users_limit_too_high(client: AsyncClient, admin_token: str):
    response = await client.get(
        "/users/?limit=101",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_list_users_limit_negative(client: AsyncClient, admin_token: str):
    response = await client.get(
        "/users/?limit=-1",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_list_users_invalid_order_by(client: AsyncClient, admin_token: str):
    response = await client.get(
        "/users/?order_by=name",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_list_users_order_by_updated_at(
    client: AsyncClient, admin_token: str, admin_user
):
    response = await client.get(
        "/users/?order_by=updated_at",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


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


async def test_create_user_invalid_email(client: AsyncClient, admin_token: str):
    response = await client.post(
        "/users/",
        json={
            "username": "testuser",
            "email": "not-an-email",
            "password": "password123",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_create_user_missing_fields(client: AsyncClient, admin_token: str):
    response = await client.post(
        "/users/",
        json={},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_create_user_invalid_role(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "password123",
            "role": "superadmin",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


async def test_create_user_inactive(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "password123",
            "is_active": False,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    assert response.json()["is_active"] is False


async def test_create_user_admin_role(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "password123",
            "role": "admin",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    assert response.json()["role"] == "admin"


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


async def test_get_user_unauthenticated(client: AsyncClient):
    response = await client.get(f"/users/{uuid4()}")
    assert response.status_code == 401


async def test_update_user_full(client: AsyncClient, admin_token: str):
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

    new_suffix = uuid4().hex[:8]
    response = await client.put(
        f"/users/{user_id}",
        json={
            "username": f"updated_{new_suffix}",
            "email": f"updated_{new_suffix}@example.com",
            "is_active": False,
            "role": "admin",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == f"updated_{new_suffix}"
    assert body["email"] == f"updated_{new_suffix}@example.com"
    assert body["is_active"] is False
    assert body["role"] == "admin"


async def test_update_user_partial(client: AsyncClient, admin_token: str):
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

    new_suffix = uuid4().hex[:8]
    response = await client.put(
        f"/users/{user_id}",
        json={"username": f"partial_{new_suffix}"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["username"] == f"partial_{new_suffix}"


async def test_update_user_password(client: AsyncClient, admin_token: str):
    suffix = uuid4().hex[:8]
    create_response = await client.post(
        "/users/",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "old_password",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]

    update_response = await client.put(
        f"/users/{user_id}",
        json={"password": "new_password"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_response.status_code == 200

    login_response = await client.post(
        "/auth/token",
        data={"username": f"user_{suffix}", "password": "new_password"},
    )
    assert login_response.status_code == 200


async def test_update_user_not_found(client: AsyncClient, admin_token: str):
    response = await client.put(
        f"/users/{uuid4()}",
        json={"username": "doesnotmatter"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


async def test_update_user_duplicate_email(
    client: AsyncClient, admin_token: str, admin_user
):
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

    response = await client.put(
        f"/users/{user_id}",
        json={"email": "admin@example.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 409


async def test_update_user_duplicate_username(
    client: AsyncClient, admin_token: str, admin_user
):
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

    response = await client.put(
        f"/users/{user_id}",
        json={"username": "admin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 409


async def test_update_user_invalid_role(client: AsyncClient, admin_token: str):
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

    response = await client.put(
        f"/users/{user_id}",
        json={"role": "superadmin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


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


async def test_delete_user_not_found(client: AsyncClient, admin_token: str):
    response = await client.delete(
        f"/users/{uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


async def test_delete_user_unauthenticated(client: AsyncClient):
    response = await client.delete(f"/users/{uuid4()}")
    assert response.status_code == 401
