from uuid import uuid4

from httpx import AsyncClient


class TestListUsers:
    async def test_authenticated(
        self, client: AsyncClient, admin_token: str, admin_user
    ):
        response = await client.get(
            "/admin/users/",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_no_token(self, client: AsyncClient):
        response = await client.get("/admin/users/")
        assert response.status_code == 401

    async def test_offset_negative(self, client: AsyncClient, admin_token: str):
        response = await client.get(
            "/admin/users/?offset=-1",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_limit_too_high(self, client: AsyncClient, admin_token: str):
        response = await client.get(
            "/admin/users/?limit=101",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_limit_negative(self, client: AsyncClient, admin_token: str):
        response = await client.get(
            "/admin/users/?limit=-1",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_invalid_order_by(self, client: AsyncClient, admin_token: str):
        response = await client.get(
            "/admin/users/?order_by=name",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_order_by_updated_at(
        self, client: AsyncClient, admin_token: str, admin_user
    ):
        response = await client.get(
            "/admin/users/?order_by=updated_at",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestCreateUser:
    async def test_valid(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        response = await client.post(
            "/admin/users/",
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

    async def test_duplicate_email(
        self, client: AsyncClient, admin_token: str, admin_user
    ):
        response = await client.post(
            "/admin/users/",
            json={
                "username": "other_admin",
                "email": "admin@example.com",
                "password": "password123",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 409

    async def test_duplicate_username(
        self, client: AsyncClient, admin_token: str, admin_user
    ):
        response = await client.post(
            "/admin/users/",
            json={
                "username": "admin",
                "email": "other@example.com",
                "password": "password123",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 409

    async def test_invalid_email(self, client: AsyncClient, admin_token: str):
        response = await client.post(
            "/admin/users/",
            json={
                "username": "testuser",
                "email": "not-an-email",
                "password": "password123",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_missing_fields(self, client: AsyncClient, admin_token: str):
        response = await client.post(
            "/admin/users/",
            json={},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_invalid_role(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        response = await client.post(
            "/admin/users/",
            json={
                "username": f"user_{suffix}",
                "email": f"user_{suffix}@example.com",
                "password": "password123",
                "role": "superadmin",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_inactive(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        response = await client.post(
            "/admin/users/",
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

    async def test_admin_role(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        response = await client.post(
            "/admin/users/",
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


class TestGetUser:
    async def test_found(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["id"] == user_id

    async def test_can_read_any_user(
        self, client: AsyncClient, admin_token: str, member_user
    ):
        response = await client.get(
            f"/admin/users/{member_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200


class TestUpdateUser:
    async def test_full(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
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

    async def test_partial(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"username": f"partial_{new_suffix}"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["username"] == f"partial_{new_suffix}"

    async def test_password(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"password": "new_password"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert update_response.status_code == 200

        login_response = await client.post(
            "/auth/token",
            data={"username": f"user_{suffix}", "password": "new_password"},
        )
        assert login_response.status_code == 200

    async def test_not_found(self, client: AsyncClient, admin_token: str):
        response = await client.put(
            f"/admin/users/{uuid4()}",
            json={"username": "doesnotmatter"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    async def test_duplicate_email(
        self, client: AsyncClient, admin_token: str, admin_user
    ):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"email": "admin@example.com"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 409

    async def test_duplicate_username(
        self, client: AsyncClient, admin_token: str, admin_user
    ):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"username": "admin"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 409

    async def test_invalid_role(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"role": "superadmin"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    async def test_can_update_role(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["role"] == "admin"

    async def test_can_deactivate(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False


class TestDeleteUser:
    async def test_delete(self, client: AsyncClient, admin_token: str):
        suffix = uuid4().hex[:8]
        create_response = await client.post(
            "/admin/users/",
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
            f"/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert delete_response.status_code == 204

        get_response = await client.get(
            f"/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert get_response.status_code == 404

    async def test_not_found(self, client: AsyncClient, admin_token: str):
        response = await client.delete(
            f"/admin/users/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    async def test_unauthenticated(self, client: AsyncClient):
        response = await client.delete(f"/admin/users/{uuid4()}")
        assert response.status_code == 401


class TestMemberAccessControl:
    async def test_cannot_list_users(self, client: AsyncClient, member_token: str):
        response = await client.get(
            "/admin/users/",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 403

    async def test_cannot_create_user(self, client: AsyncClient, member_token: str):
        response = await client.post(
            "/admin/users/",
            json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "password123",
            },
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 403

    async def test_cannot_delete_user(self, client: AsyncClient, member_token: str):
        response = await client.delete(
            f"/admin/users/{uuid4()}",
            headers={"Authorization": f"Bearer {member_token}"},
        )
        assert response.status_code == 403
