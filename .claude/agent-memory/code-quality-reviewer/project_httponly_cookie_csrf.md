---
name: httponly-cookie-csrf-migration
description: FT-43 auth migration from bearer tokens to httpOnly session cookie + double-submit CSRF — design decisions and residual gaps to check on future auth diffs
metadata:
  type: project
---

FT-43 (merged via 13 commits ending `91d4ce9`) migrated auth from `Authorization: Bearer` + localStorage to an httpOnly `session` cookie (JWT) plus a readable `csrf_token` cookie, checked via double-submit against an `X-CSRF-Token` header.

Design, confirmed sound on review:
- `verify_csrf` (app/dependencies/auth.py) depends on `current_user` first so unauthenticated requests get 401 before CSRF's 403 — correct ordering, documented in the docstring.
- Uses `secrets.compare_digest` for the cookie/header comparison (timing-safe).
- `SameSite=Lax` on both cookies + strict CORS `allow_origins` (no credentialed wildcard) means cross-site POST/PUT/PATCH/DELETE won't carry the session cookie at all, and a custom `X-CSRF-Token` header forces a preflight that a non-allowlisted origin can't pass — double-submit is defense in depth here, not the sole mitigation.
- `cookie_secure` defaults `True`, documented override (`COOKIE_SECURE=false`) in `.env.example` for local http dev.
- All mutating routes audited and confirmed to carry `dependencies=[..., VerifyCsrf]`: user (PUT), transaction (create/PATCH/delete), auth logout. `/auth/token` (login), `/auth/signup` (public signup, added FT-45), and GETs correctly exempt. (`admin_user` router no longer exists as of FT-45 — role system removed.)
- Exception mapped via domain `CsrfError(AuthError)` → handler in `exception_handlers.py`, not raised as `HTTPException` in the dependency — compliant with the project's layering rule.

Residual gaps worth flagging on future related diffs (minor, not blocking):
- `/auth/logout` requires both a valid session (`CurrentUserDep`) and a valid CSRF match to succeed. If either cookie is already missing/stale (e.g. user manually cleared cookies, or CSRF cookie lost), logout 401s/403s and cannot clear the httpOnly cookie server-side — user is stuck until natural `max_age` expiry (30 min, tied to `access_token_expire_minute`). Low severity since the session cookie is still unusable without the JWT being valid, but worth a passing mention if this recurs.
- `logout` handler's `current_user: CurrentUserDep` param is unused except to force the auth dependency to run — slightly unclear; an underscore-prefixed name or comment would clarify intent.
- Frontend `auth.tsx` `logout()` does `await logoutRequest(); setUser(null)` with no try/finally — if the network call throws, local UI state never flips to logged-out even though the user clicked logout.
- `LoginResponse` schema (`{detail: str}`) is reused verbatim as the return type for `/auth/logout` — generic enough to work, but the name is login-specific; a shared `AuthActionResponse` would read better if this pattern grows.

**Why:** This was a full auth-layer migration with real CSRF/cookie-flag risk; recorded so future reviews don't need to re-derive the double-submit + SameSite reasoning from scratch.
**How to apply:** On any diff touching `app/dependencies/auth.py`, `app/routers/auth.py`, or cookie settings, re-verify the mutating-route CSRF audit list above still holds, and check whether any of the four residual gaps were addressed or regressed.
