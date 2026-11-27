# Spec for CORS Middleware

branch: FT-30_cors-middleware

## Summary
The API currently has no CORS configuration, which blocks any browser-based frontend (e.g. the Next.js dashboard at `http://localhost:3000`) from calling it cross-origin. Add `CORSMiddleware` to the FastAPI app with an allow-list of origins sourced from settings, scoped to the methods and headers the dashboard actually needs.

## Functional Requirements
- Add a `cors_origins: list[str]` field to `app/config/settings.py`, default `["http://localhost:3000"]`.
- Add the corresponding entry/example to `.env.example`. `pydantic-settings` parses `list[str]` fields from env vars as JSON, so the example must use JSON array syntax, e.g. `CORS_ORIGINS='["http://localhost:3000"]'` — not a comma-separated string.
- Register `CORSMiddleware` in `app/main.py` using `settings.cors_origins`:
  - `allow_credentials=False` (auth is via `Authorization: Bearer <token>`, not cookies).
  - `allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]`.
  - `allow_headers=["Authorization", "Content-Type"]`.

## Possible Edge Cases
- `cors_origins` left empty (`[]`) — middleware should still register without error; no origins will be allowed, which is a valid (if restrictive) configuration.
- A request from an origin not in the allow-list — the browser blocks it client-side; the server should not raise an error, it simply omits the CORS headers for that origin.
- Preflight `OPTIONS` requests must succeed for all mutating routes (POST/PUT/PATCH/DELETE) used by the dashboard.
- Multiple origins supplied via the environment variable (as a JSON array string) must be parsed correctly into a list.

## Acceptance Criteria
- A browser app running on an allowed origin (e.g. `http://localhost:3000`) can call any existing endpoint (`/auth/token`, `/users/*`, `/admin/users/*`, `/transactions/*`) and receive the appropriate `Access-Control-Allow-Origin` response header.
- A preflight `OPTIONS` request to a mutating endpoint returns the expected `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`.
- Requests from an origin not in `cors_origins` do not receive CORS headers.
- No existing endpoint behavior, auth flow, or non-browser client (e.g. pytest's `httpx` client, `curl`) is affected by the change.

## Open Questions
- None.

## Testing Guidelines
Create a test file in `./tests` for this feature, with meaningful but not excessive coverage:
- A request with an `Origin` header matching an allowed origin receives the `Access-Control-Allow-Origin` header in the response.
- A preflight `OPTIONS` request to a mutating route (e.g. `/transactions/`) returns `200` with the expected `Access-Control-Allow-Methods`/`Access-Control-Allow-Headers`.
- A request with an `Origin` header not in the allow-list does not receive an `Access-Control-Allow-Origin` header.
