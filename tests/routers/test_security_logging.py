import logging

from helpers import auth_kwargs


class TestSecurityLogging:
    async def test_credential_error_logs_warning(self, client, caplog):
        with caplog.at_level(logging.WARNING, logger="exception_handlers"):
            response = await client.post(
                "/auth/token",
                data={"username": "nobody", "password": "wrong"},
            )
        assert response.status_code == 401
        assert any(
            "security_not_authenticated" in r.message and r.levelno == logging.WARNING
            for r in caplog.records
        )

    async def test_forbidden_logs_warning(
        self, client, member_token, admin_user, caplog
    ):
        with caplog.at_level(logging.WARNING, logger="exception_handlers"):
            response = await client.get(
                f"/users/{admin_user.id}",
                **auth_kwargs(member_token),
            )
        assert response.status_code == 403
        assert any(
            "security_forbidden" in r.message and r.levelno == logging.WARNING
            for r in caplog.records
        )

    async def test_no_token_in_warning_message(self, client, caplog):
        bad_token = "not-a-valid-token"
        with caplog.at_level(logging.WARNING, logger="exception_handlers"):
            response = await client.get(
                "/users/me",
                cookies={"session": bad_token},
            )
        assert response.status_code == 401
        for r in caplog.records:
            if r.levelno == logging.WARNING:
                assert bad_token not in r.message
