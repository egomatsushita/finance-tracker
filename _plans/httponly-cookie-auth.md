# Plan: FT-43 — httpOnly Cookie + CSRF Auth

## Context
FT-35 built the frontend auth plumbing (`web/lib/api.ts`, `web/lib/auth.tsx`) around a bearer JWT stored in `localStorage`, an accepted-at-the-time tradeoff: any XSS elsewhere in the app can read and exfiltrate the token. This ticket (spec: `_specs/httponly-cookie-auth.md`, branch `FT-43_httponly-cookie-auth`) closes that gap by moving the session JWT into an httpOnly cookie, with a non-httpOnly `csrf_token` cookie for the double-submit CSRF pattern on mutating requests. It's a hard cutover (no dual-mode transition), intended to land after FT-36 (login page) ships against the current bearer-token model, so the login UI never has to change — only the transport layer underneath `useAuth()`/`api` does.

A research pass confirmed: `login()` uses the real 30-minute `access_token_expire_minute` (not the 15-min default elsewhere in `AuthService`); `CurrentUserDep`/CSRF enforcement must be applied per-route (not uniformly at router level) because `admin_user.py` applies `RequireAdmin` router-wide (including GETs) while `transaction.py`/`user.py` use per-route dependencies; there's no existing cookie usage anywhere in the codebase, so this introduces the pattern fresh; and the `FT-36_login-page` branch has no commits yet, so this ticket may need to bootstrap the Vitest harness itself if FT-36 hasn't landed it first — check at implementation time.

## Backend design

**CSRF token:** plain `secrets.token_urlsafe(32)`, not a signed JWT. Double-submit's security property comes from the browser's same-origin policy blocking a cross-site attacker from reading the cookie value, not from the token being unforgeable — a signed value adds JWT/`secret_key` coupling and its own expiry semantics for no real benefit.

**`app/errors/auth.py`** — add, following the existing no-arg-constructor pattern:
```python
class CsrfError(AuthError):
    def __init__(self):
        super().__init__("CSRF token missing or invalid")
```

**`app/exception_handlers.py`** — import `CsrfError`; add a handler mirroring `forbidden_error_handler` (403, `logger.warning("security_csrf_error method=%s path=%s", ...)`, no special headers). Also drop `headers={"WWW-Authenticate": "Bearer"}` from the `CredentialError`/`NotAuthenticatedError` handlers — no longer accurate once auth isn't a Bearer scheme; no test depends on that header.

**`app/schemas/auth.py`** — add `LoginResponse(BaseModel): detail: str`. `Token`/`TokenPayload` stay as internal DTOs (`AuthService.login()` keeps returning `Token`; the router just stops exposing it). The JSON body must never carry the raw JWT again — that's the whole point of `httponly`.

**`app/config/settings.py`** — add `cookie_secure: bool = True`, `cookie_domain: str | None = None`. **`.env.example`** — add both, with a comment on the local-http footgun (`Secure` cookies never arrive over plain `http://`; set `COOKIE_SECURE=false` locally).

**`app/dependencies/auth.py`** — replace `OAuth2PasswordBearer`-based extraction with a `Cookie`-based one; everything downstream (`_decode_username`, `get_current_user`, `verify_admin`, `verify_ownership`) is unchanged:
```python
SessionCookie = Annotated[str | None, Cookie(alias="session")]

def _require_session_token(session: SessionCookie) -> str:
    if session is None:
        raise CredentialError()
    return session

TokenDep = Annotated[str, Depends(_require_session_token)]
```
Add a new standalone CSRF dependency (mirrors `verify_admin`'s raise-domain-exception shape):
```python
async def verify_csrf(request: Request) -> None:
    cookie_value = request.cookies.get("csrf_token")
    header_value = request.headers.get("x-csrf-token")
    if not cookie_value or not header_value or not secrets.compare_digest(cookie_value, header_value):
        raise CsrfError()

VerifyCsrf = Depends(verify_csrf)
```
Dropping `oauth2_scheme` means `/docs`'s "Authorize" button stops working for this scheme — expected, note in the PR description only.

**`app/routers/auth.py`** — the main router change. Inject `Response`, set both cookies on login (`httponly=True` for `session`, `False` for `csrf_token`; both get `max_age=settings.access_token_expire_minute * 60`, `path="/"`, `domain=settings.cookie_domain`, `secure=settings.cookie_secure`, `samesite="lax"`). Return `LoginResponse(detail="ok")` instead of `Token`. Add `POST /auth/logout` (requires `CurrentUserDep` **and** `VerifyCsrf` — CSRF applies uniformly to every mutating authenticated route, including logout, no special-casing), which clears both cookies via `response.delete_cookie(...)` with matching `path`/`domain`/`samesite`.

**CSRF enforcement placement** (per-route, since dependency shape differs by router):
- `app/routers/admin_user.py` — add `dependencies=[VerifyCsrf]` to `POST /`, `PUT /{user_id}`, `DELETE /{user_id}` only (router-level `RequireAdmin` already covers all methods incl. GETs, which don't need CSRF).
- `app/routers/transaction.py` — add `dependencies=[VerifyCsrf]` to `POST /`, `PATCH /{transaction_id}`, `DELETE /{transaction_id}`.
- `app/routers/user.py` — `PUT /{user_id}` decorator becomes `dependencies=[VerifyOwnership, VerifyCsrf]`.

**`app/main.py`** — `CORSMiddleware`: `allow_credentials=True` (required for cookies cross-origin), `allow_headers=["X-CSRF-Token", "Content-Type"]` (drop `Authorization`, confirmed unused elsewhere).

## Backend test changes

Blast radius (confirmed by grep): 6 files, ~150 call sites, use `headers={"Authorization": f"Bearer {admin_token|member_token}"}`: `test_admin_users.py`, `test_transactions.py`, `test_transaction_summary.py`, `test_users.py`, `test_security_logging.py`, `test_auth.py`. (`test_auth_service.py` is unaffected — confirmed it doesn't reference these fixtures at all.)

- New `tests/helpers.py`: `AuthCookies` dataclass (`session`, `csrf` fields) + `auth_kwargs(auth, csrf=False)` helper building `cookies=`/`headers=` kwargs for a request — `csrf=True` adds the `X-CSRF-Token` header for mutating calls.
- `tests/conftest.py` — `admin_token`/`member_token` fixtures now extract `response.cookies["session"]`/`["csrf_token"]` into `AuthCookies` instead of parsing `response.json()["access_token"]`.
- Mechanical migration: GET-only call sites → `**auth_kwargs(token)`; mutating call sites → `**auth_kwargs(token, csrf=True)`. Do **one file first** (e.g. `test_transactions.py`) to confirm per-call `cookies=` correctly overrides the shared session-scoped client's jar (httpx merges request-level cookies over the jar's, so "last login wins" ambient state is never actually read) before mechanically applying the same pattern to the other four.
- `test_transaction_summary.py`'s local `_create_transaction()` helper: change its `token: str` param to `token: AuthCookies`, swap header for `**auth_kwargs(token, csrf=True)`.
- `test_auth.py`: `test_login_valid` now asserts `body == {"detail": "ok"}` plus that `session`/`csrf_token` cookies are set and `session` is `HttpOnly` while `csrf_token` isn't (explicit acceptance criterion). Negative tests (`test_invalid_token`, `test_expired_token`, `test_token_missing_sub`) swap `headers={"Authorization": ...}` for `cookies={"session": token}`. Rename `test_missing_auth_header` → `test_missing_session_cookie`. Add new: `test_logout_clears_cookies`, `test_csrf_missing_header_rejected`, `test_csrf_mismatched_header_rejected`, `test_csrf_valid_header_accepted` (the latter three against a mutating route like `POST /transactions/`).

## Frontend design

**`web/lib/types.ts`** — `LoginResponse` becomes `{ detail: string }` (was `{ access_token, token_type }`).

**`web/lib/api.ts`**:
- Remove `TOKEN_KEY`, `getToken`, `setToken`, `clearToken` entirely.
- `handleUnauthorized()` drops its `clearToken()` call (nothing client-readable to clear) but keeps the redirect + dedup guard.
- Add `readCsrfToken()` — parses `document.cookie` for `csrf_token` (intentionally non-httpOnly so JS can read it).
- `request<T>()`: drop the `Authorization` header logic; add `credentials: 'include'` to the `fetch` call; when `init.method` is not `GET`, attach `X-CSRF-Token` from `readCsrfToken()`.
- `loginRequest`: add `credentials: 'include'`; return type becomes `Promise<LoginResponse>` (`{ detail: string }`) — caller stops destructuring `access_token`.
- New `logoutRequest()` — `POST /auth/logout` via the same `request()`/`api.post` path so CSRF/credentials are handled uniformly.

**`web/lib/auth.tsx`**:
- `hydrate()` drops its `getToken()` short-circuit — always attempts `GET /users/me` (`skipAuthRedirect: true`), catches any failure as logged-out.
- `login()` drops `setToken(access_token)` — cookie arrives via `Set-Cookie` automatically; keeps `resetUnauthorizedGuard()` + re-hydrate.
- `logout()` becomes `async`: calls `logoutRequest()`, then `setUser(null)`. Update `AuthContextValue`'s `logout` type to `() => Promise<void>`.

**Frontend tests (Vitest + RTL)** — check whether `FT-36_login-page` already bootstrapped the harness; if not, add `vitest`, `@testing-library/react`, `jsdom`, `vitest.config.ts`, and a `test` script here instead of assuming it exists. Write failing tests first, per the TDD convention in `_plans/dashboard.md`:
- `web/lib/api.test.ts` — mutating calls attach `X-CSRF-Token` from a mocked `document.cookie`; `GET` calls don't; every call includes `credentials: 'include'`; no `Authorization` header is ever set.
- `web/lib/auth.test.tsx` — hydration succeeds/fails purely based on a mocked `/users/me` response (no token setup needed); `login()` never writes to `localStorage`; `logout()` calls `logoutRequest()` and clears `user`.
- Manual end-to-end check (not automated — cookie `Set-Cookie`/`Secure`/`SameSite` behavior can't be fully exercised via jsdom): login → refresh → authed mutation with CSRF header → logout → confirm next request is rejected.

## Commit breakdown

**Backend:**
1. `feat: add CsrfError domain exception and handler` — `app/errors/auth.py`, `app/exception_handlers.py`
2. `feat: add LoginResponse schema for cookie-based login` — `app/schemas/auth.py`
3. `feat: add cookie_secure/cookie_domain settings` — `app/config/settings.py`, `.env.example`
4. `feat: extract session JWT from cookie instead of Authorization header` — `app/dependencies/auth.py`
5. `feat: add verify_csrf double-submit dependency` — `app/dependencies/auth.py`
6. `feat: set session and csrf_token cookies on login, add logout endpoint` — `app/routers/auth.py`
7. `feat: enforce CSRF on mutating admin, user, and transaction routes` — `app/routers/admin_user.py`, `app/routers/user.py`, `app/routers/transaction.py`
8. `feat: enable credentialed CORS for cookie-based auth` — `app/main.py`
9. `test: migrate auth test fixtures and negative-path tests to cookies` — `tests/conftest.py`, `tests/helpers.py` (new), `tests/routers/test_auth.py`
10. `test: migrate admin/user/transaction/summary/security-logging tests to cookie auth` — the 5 affected test files
11. `test: add CSRF enforcement and logout coverage` — `tests/routers/test_auth.py`

**Frontend:**
12. `chore: bootstrap Vitest + React Testing Library` (only if FT-36 hasn't already) — `web/package.json`, `web/vitest.config.ts`
13. `test: add failing tests for cookie-based api client and auth context` — `web/lib/api.test.ts`, `web/lib/auth.test.tsx`
14. `feat: remove localStorage token handling, add credentials/CSRF to fetch wrapper` — `web/lib/api.ts`, `web/lib/types.ts`
15. `feat: switch AuthProvider to cookie-based login/logout/hydration` — `web/lib/auth.tsx`

## Critical files
- `app/routers/auth.py` — cookie-setting, logout endpoint
- `app/dependencies/auth.py` — cookie extraction, CSRF dependency
- `tests/conftest.py` — fixture migration (unblocks all other test file changes)
- `web/lib/api.ts` — fetch wrapper rewrite
- `web/lib/auth.tsx` — auth context rewrite

## Verification
1. Backend: `uv run pytest` (full suite) — run when asked, per project convention.
2. Manual: `uv run app/main.py` + `npm run dev` in `web/` — login via `/login`, inspect dev tools' Application/cookies panel for `session` (HttpOnly flag set) and `csrf_token` (not HttpOnly); perform an authed mutation (e.g. create a transaction) and confirm it succeeds with the CSRF header attached; call logout and confirm both cookies clear and a subsequent request 401s.
3. Frontend: `npm run build`, `npm run lint`, `npm run test` all clean.
