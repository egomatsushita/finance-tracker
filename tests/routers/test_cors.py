class TestCors:
    async def test_allowed_origin_receives_cors_header(self, client):
        response = await client.post(
            "/auth/token",
            data={"username": "nobody", "password": "wrong"},
            headers={"Origin": "http://localhost:3000"},
        )
        assert (
            response.headers["access-control-allow-origin"] == "http://localhost:3000"
        )

    async def test_disallowed_origin_has_no_cors_header(self, client):
        response = await client.post(
            "/auth/token",
            data={"username": "nobody", "password": "wrong"},
            headers={"Origin": "http://evil.example.com"},
        )
        assert "access-control-allow-origin" not in response.headers

    async def test_preflight_options_request(self, client):
        response = await client.options(
            "/transactions/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        assert response.status_code == 200
        allow_methods = response.headers["access-control-allow-methods"]
        assert "POST" in allow_methods
        allow_headers = response.headers["access-control-allow-headers"].lower()
        assert "authorization" in allow_headers
        assert "content-type" in allow_headers
