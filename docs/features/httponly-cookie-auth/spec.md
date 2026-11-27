# Spec for httpOnly Cookie + CSRF Auth

branch: FT-43_httponly-cookie-auth

## Summary
Replace the bearer-token-in-`localStorage` auth model (shipped in FT-35, `_specs/api-client-auth-foundation.md`) with an httpOnly, `Secure`, `SameSite` session cookie set by the backend, plus a double-submit CSRF token for mutating requests. This closes the XSS-can-steal-the-token gap explicitly accepted as a tradeoff in FT-35, at the cost of touching already-merged backend auth code and the FT-35 frontend (`web/lib/api.ts`, `web/lib/auth.tsx`). No UI changes — this is a transport-layer swap behind the existing `useAuth()`/`api` interfaces.

## Functional Requirements

### Backend
- `app/routers/auth.py` — `POST /auth/token` keeps its existing form-encoded request shape, but instead of (or in addition to, for a transition window) returning `access_token` in the JSON body, it sets:
  - A `session` cookie carrying the JWT: `httponly=True`, `secure=True` (prod)/`False` (local http dev — gate on an env setting), `samesite="lax"`, `max_age` matching `access_token_expire_minute`.
  - A `csrf_token` cookie: **not** httpOnly (JS must read it to echo it back), same `secure`/`samesite`, random value independent of the JWT, same `max_age`.
- New `POST /auth/logout` endpoint — clears both cookies (`delete_cookie` for `session` and `csrf_token`), requires a valid session (reuse `CurrentUserDep`).
- `app/dependencies/auth.py` — `verify_token`/`get_current_user` read the JWT from the `session` cookie instead of `TokenDep`'s `OAuth2PasswordBearer` header extraction. `OAuth2PasswordBearer(tokenUrl=...)` is dropped from the dependency chain; `oauth2_scheme` is no longer used, which means the `/docs` "Authorize" button workflow changes — document this in the PR description, not a blocker.
- New `verify_csrf` dependency — on state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`), compares a request header (e.g. `X-CSRF-Token`) against the `csrf_token` cookie value; raises a new `CsrfError` domain exception (`app/errors/auth.py`) on mismatch, mapped to 403 in `exception_handlers.py`. Applied at the router level alongside existing auth dependencies (GET requests don't need it — no state change, nothing to forge).
- `app/config/settings.py` — add `cookie_secure: bool = True` (settable to `False` in local `.env` since dev runs over http) and `cookie_domain: str | None = None`.
- `app/main.py` — `CORSMiddleware`'s `allow_credentials` flips `False` → `True` (required for the browser to send/receive cookies cross-origin); `allow_origins` must stay an explicit list (already is) since credentialed CORS forbids `"*"`.

### Frontend
- `web/lib/api.ts` — remove `getToken`/`setToken`/`clearToken` and the `TOKEN_KEY`/`localStorage` logic entirely. `request()` adds `credentials: 'include'` to every `fetch` call (sends cookies automatically; no `Authorization` header to attach — drop that branch). For mutating methods (`post`/`put`/`patch`/`del`), read the `csrf_token` cookie (plain `document.cookie` parse, since it's intentionally non-httpOnly) and set it as the `X-CSRF-Token` header.
- `loginRequest` stays form-encoded to `/auth/token`, but no longer parses/returns `access_token` from the body (the cookie is set by the `Set-Cookie` response header automatically) — it returns nothing, or just resolves on success; still must use `credentials: 'include'` so the `Set-Cookie` is accepted.
- New `logoutRequest()` in `api.ts` — `POST /auth/logout` with `credentials: 'include'`.
- `web/lib/auth.tsx` — `login()` drops `setToken(access_token)`; `logout()` becomes `async`, calls `logoutRequest()` then clears local `user` state (cookie clearing happens server-side via `Set-Cookie` with expired `max_age`).
- `handleUnauthorized()`'s redirect-on-401 logic is unchanged in spirit (still fires on a 401 from any authed request) but no longer calls `clearToken()` — there's no client-side token to clear; the cookie is either still present (and will keep failing until logout/expiry) or already expired.

## Possible Edge Cases
- Local dev runs the frontend on `http://localhost:3000` and backend on `http://127.0.0.1:8000` — different origins. A `SameSite=Lax` cookie is sent on top-level navigation and simple cross-site GETs, but **cross-origin `fetch` always needs the request to include credentials explicitly** (`credentials: 'include'`) and the server response needs `Access-Control-Allow-Credentials: true` plus a non-wildcard `Access-Control-Allow-Origin` — already true here, but worth a specific manual check since this is the first time credentialed CORS is exercised.
- `Secure` cookies are not sent over plain `http://` — local dev must run with `cookie_secure=False` via `.env`, or cookies silently never arrive and every request looks like "not logged in" with no obvious error. Document this clearly in the backend `.env.example`.
- CSRF double-submit relies on JS reading `document.cookie` for `csrf_token` — if a future change makes `csrf_token` httpOnly by mistake, every mutating request breaks silently (JS can't read the header value to send). Add a test asserting the cookie is readable.
- Existing FT-35 frontend code and any already-written tests (the login page's planned Vitest suite, if FT-36 lands first) that mock `localStorage`/`getToken` will need updating — sequencing matters; see Open Questions.
- `/auth/token`'s OpenAPI "Authorize" button in `/docs` (Swagger UI) is built around `OAuth2PasswordBearer` and won't work against a cookie-based scheme out of the box — acceptable loss for `/docs`-based manual testing, call it out so it's not mistaken for a regression.
- Logout must clear the cookie with matching `path`/`domain`/`samesite` attributes as when it was set, or the browser won't actually remove it (a common `delete_cookie` footgun).

## Acceptance Criteria
- `POST /auth/token` with valid credentials returns `Set-Cookie` headers for `session` (httpOnly) and `csrf_token` (not httpOnly), and the response body no longer carries a usable bearer token for cross-site use.
- An authed `GET` (e.g. `/users/me`) succeeds with only the cookie attached, no `Authorization` header.
- An authed `POST`/`PATCH`/`DELETE` without the `X-CSRF-Token` header (or with a mismatched value) is rejected with 403; with the correct header read from `csrf_token`, it succeeds.
- `POST /auth/logout` clears both cookies; a subsequent authed request returns 401.
- `npm run build`, `npm run lint`, and `npm run test` pass; `uv run pytest` passes including new coverage below.
- Manual check: fresh browser session, login, refresh the page — `useAuth()` still hydrates the user (cookie persisted across reload, unlike the old `localStorage` flow which also persisted, so behavior here should look identical to a user).

## Open Questions
- Sequencing: should this land before or after FT-36 (login page)? Recommend **after** FT-36 ships against the current bearer-token FT-35 code, then this ticket does a clean follow-up swap of the transport layer — avoids blocking the login page on a backend auth rework, and the login page's `useAuth()`/`api` call sites don't change either way (the swap is encapsulated in `lib/api.ts`/`lib/auth.tsx`). (Follow the recommended)
- Should `/auth/token`'s response body keep returning `token_type`/a success flag for the frontend to key off of, or return 204? Recommend keeping a minimal JSON body (e.g. `{ "detail": "ok" }`) rather than 204 — gives the frontend something to type-check against and matches the existing error-envelope convention of always returning JSON. (Follow the recommended)
- Transition strategy: hard cutover (one PR flips both backend and frontend together) vs. dual-mode (backend accepts both header and cookie for a window)? Recommend hard cutover — this is a single-deployment demo app with no external API consumers depending on the bearer-token shape, so dual-mode adds complexity for no real migration benefit. (Follow the recommended)

## Testing Guidelines
Backend (`uv run pytest`, in-memory SQLite, do not run unless asked):
- `tests/routers/test_auth.py` (new or extended): login sets both cookies with correct flags (httponly on `session`, not on `csrf_token`); logout clears both; a protected route rejects when the `session` cookie is missing/invalid; a mutating route rejects with 403 when `X-CSRF-Token` is missing or doesn't match `csrf_token`, and succeeds when it does.
- `tests/dependencies/test_auth.py` (if it exists, else add cases to the router tests): `verify_csrf` dependency unit-level mismatch/match cases.

Frontend (Vitest + React Testing Library, per `_plans/dashboard.md`'s TDD convention — write failing tests first):
- `api.ts`: mutating requests attach `X-CSRF-Token` read from a mocked `document.cookie`; `request()` is called with `credentials: 'include'`; no `Authorization` header is set.
- `auth.tsx`: `login()` no longer stores anything in `localStorage`; `logout()` calls the new logout endpoint and clears `user` state; mount-time hydration still works purely off cookies (mock the `/users/me` fetch, no token setup needed).
- One manual end-to-end check against the real backend (cookies can't be fully exercised by jsdom/mocked fetch in the same way as a real browser — Set-Cookie behavior, `Secure`/`SameSite` enforcement): login, refresh, authed mutation with CSRF header, logout, confirm subsequent request is rejected.
