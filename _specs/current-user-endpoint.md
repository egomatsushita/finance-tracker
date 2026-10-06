# Spec for Current User Endpoint

branch: FT-31_current-user-endpoint

## Summary
There is currently no way for an authenticated client to discover its own user id, role, or profile. The user list is admin-only, and `/users/{user_id}` requires already knowing the id. A frontend needs this immediately after login to populate auth state (id, role) and drive role-based navigation. Add `GET /users/me` to resolve the caller's own record from the token.

## Functional Requirements
- `user_router` currently applies `VerifyOwnership` as a **router-level** dependency (`dependencies=[VerifyOwnership]` on the `APIRouter(...)` constructor), and `verify_ownership` requires a `user_id: UUID` path parameter. Router-level dependencies apply to every route on that router, so adding a dependency-less `/me` route to it as-is would break: FastAPI would treat `user_id` as a required query parameter on `/me` (since there's no `{user_id}` path segment) and 422 on every call. This must be fixed as part of this change:
  - Remove `dependencies=[VerifyOwnership]` from the `APIRouter(...)` constructor.
  - Add `dependencies=[VerifyOwnership]` directly to the existing `GET /{user_id}` and `PUT /{user_id}` route decorators instead, preserving their current ownership-check behavior exactly.
- Add `GET /users/me` in `app/routers/user.py`, with no `VerifyOwnership` dependency — authentication alone is enforced by depending on `CurrentUserDep` to resolve the caller's id (an invalid/missing/expired token already raises `CredentialError` there).
- Declare `/me` before `/{user_id}` in the router so the static `/me` path takes precedence over the `/{user_id}` UUID path parameter.
- Reuse the existing user service read path and `UserReadSchema` — no new schema.
- Any authenticated user (member or admin) can call this for their own record.

## Possible Edge Cases
- Token is valid but the user it refers to has since been deleted — should behave the same as the existing `CurrentUserDep` behavior for a stale token (raises the existing credential error), not a new error type.
- Route ordering regression — a request to `/users/me` must not be captured by `/{user_id}` and fail UUID parsing.
- Member and admin both get successful, correctly-scoped responses (own data only).
- No `Authorization` header or an expired/invalid token — existing 401 behavior applies, unchanged.
- After moving `VerifyOwnership` from router-level to per-route, `GET/PUT /{user_id}` must still correctly reject a member requesting another user's id (`ForbiddenError`) and still correctly allow an admin to access any user's id — the ownership check itself must be unchanged, only its placement.

## Acceptance Criteria
- `GET /users/me` with a valid token returns `200` with the caller's own `UserReadSchema` (`id, username, email, is_active, role, created_at, updated_at`).
- `GET /users/me` with no/invalid/expired token returns the existing unauthorized error behavior.
- `GET /users/me` works identically for `admin` and `member` roles, always returning the caller's own data.
- Existing `GET`/`PUT /users/{user_id}` ownership-check behavior (member restricted to own id, admin unrestricted) is unchanged after moving `VerifyOwnership` to per-route.

## Open Questions
- None.

## Testing Guidelines
Create a test file in `./tests` for this feature, with meaningful but not excessive coverage:
- Authenticated member calling `GET /users/me` gets their own `UserReadSchema` back.
- Authenticated admin calling `GET /users/me` gets their own `UserReadSchema` back (not another user's).
- Unauthenticated request to `GET /users/me` returns the standard unauthorized response.
- `GET /users/me` is not shadowed by `/{user_id}` (i.e. it does not error as an invalid UUID, and does not 422 on a missing `user_id` query param).
- A member calling `GET`/`PUT /users/{user_id}` with another user's id still gets `ForbiddenError`; an admin calling it with any id still succeeds — confirms the per-route `VerifyOwnership` placement preserves existing behavior.
