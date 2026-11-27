# Plan: CORS Middleware (FT-30)

Spec: `_specs/cors-middleware.md`

## Context
No frontend can call this API from a browser today — there's no `CORSMiddleware` registered. This is the first of three prerequisite backend changes for the dashboard. TDD: write the test file first (it will fail/error against the current app), then implement.

## Files touched
- `app/config/settings.py` — add setting
- `.env.example` — document the new env var
- `app/main.py` — register middleware
- `tests/routers/test_cors.py` — new test file

## Step 1 — Tests first (red)
Create `tests/routers/test_cors.py` using the existing `client` fixture from `tests/conftest.py` (no auth needed — CORS headers are present regardless of auth outcome):

1. `test_allowed_origin_receives_cors_header` — `GET /auth/token`-adjacent safe route (use a simple unauthenticated-but-existing path, e.g. `GET /users/<uuid4()>` is behind auth; prefer hitting `POST /auth/token` with bad creds, or any route that returns before auth matters for header presence — CORS headers are added to all responses matching an allowed origin regardless of status code) with header `Origin: http://localhost:3000` → assert `response.headers["access-control-allow-origin"] == "http://localhost:3000"`.
2. `test_disallowed_origin_has_no_cors_header` — same request with `Origin: http://evil.example.com` → assert `"access-control-allow-origin" not in response.headers`.
3. `test_preflight_options_request` — `client.options("/transactions/", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"})` → assert `200`, and assert `"POST"` is present in `access-control-allow-methods`, and `authorization`/`content-type` are present (case-insensitive) in `access-control-allow-headers`.

Run `uv run pytest tests/routers/test_cors.py` — expect failures (no CORS headers exist yet).

## Step 2 — Implement (green)
1. `app/config/settings.py`: add `cors_origins: list[str] = ["http://localhost:3000"]` field to `Settings`.
2. `.env.example`: add `CORS_ORIGINS='["http://localhost:3000"]'` with a comment noting JSON-array format (pydantic-settings parses list env vars as JSON).
3. `app/main.py`: import `from fastapi.middleware.cors import CORSMiddleware`, and after `app = FastAPI(...)` add:
   ```
   app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.cors_origins,
       allow_credentials=False,
       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
       allow_headers=["Authorization", "Content-Type"],
   )
   ```
4. Re-run `uv run pytest tests/routers/test_cors.py` until green, then the full suite `uv run pytest` to confirm no regressions.

## Step 3 — Commit
One commit: `[FT-30] feat: add CORS middleware for frontend dashboard`.

## Verification
- `uv run pytest tests/routers/test_cors.py -v` passes.
- `uv run pytest` (full suite) passes — no regression to existing auth/user/transaction tests.
- Manual sanity check (optional): run `uv run app/main.py`, `curl -i -H "Origin: http://localhost:3000" http://127.0.0.1:8000/transactions/ -H "Authorization: Bearer invalid"` and confirm `access-control-allow-origin` header is present.
