from httpx import AsyncClient


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
