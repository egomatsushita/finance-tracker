from datetime import datetime, timezone

from httpx import AsyncClient

from services.auth import AuthService


async def test_login_valid(client: AsyncClient, admin_user):
    response = await client.post(
        "/auth/token",
        data={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


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


async def test_invalid_token(client: AsyncClient, admin_user):
    response = await client.get(
        "/users/",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert response.status_code == 401


async def test_expired_token(client: AsyncClient, admin_user):
    token = AuthService.encode_jwt(
        {"sub": "admin", "exp": datetime(2000, 1, 1, tzinfo=timezone.utc)}
    )
    response = await client.get(
        "/users/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


async def test_token_missing_sub(client: AsyncClient, admin_user):
    token = AuthService.encode_jwt({"exp": datetime(2100, 1, 1, tzinfo=timezone.utc)})
    response = await client.get(
        "/users/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


async def test_missing_auth_header(client: AsyncClient, admin_user):
    response = await client.get("/users/")
    assert response.status_code == 401
