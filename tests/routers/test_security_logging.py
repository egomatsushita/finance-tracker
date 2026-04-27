import logging


class TestSecurityLogging:
    async def test_credential_error_logs_warning(self, client, caplog):
        with caplog.at_level(logging.WARNING, logger="exception_handlers"):
            response = await client.post(
                "/auth/token",
                data={"username": "nobody", "password": "wrong"},
            )
        assert response.status_code == 401
        assert any(
            "SECURITY" in r.message and r.levelno == logging.WARNING
            for r in caplog.records
        )

    async def test_forbidden_logs_warning(self, client, member_token, caplog):
        with caplog.at_level(logging.WARNING, logger="exception_handlers"):
            response = await client.get(
                "/admin/users/",
                headers={"Authorization": f"Bearer {member_token}"},
            )
        assert response.status_code == 403
        assert any(
            "SECURITY" in r.message and "forbidden" in r.message for r in caplog.records
        )

    async def test_no_token_in_warning_message(self, client, caplog):
        bad_token = "not-a-valid-token"
        with caplog.at_level(logging.WARNING, logger="exception_handlers"):
            response = await client.get(
                "/admin/users/",
                headers={"Authorization": f"Bearer {bad_token}"},
            )
        assert response.status_code == 401
        for r in caplog.records:
            if r.levelno == logging.WARNING:
                assert bad_token not in r.message
                assert "Bearer" not in r.message
