# Spec for User Role Permissions

branch: FT-20_user-role-permissions

## Summary

Currently all authenticated users have equal access to every user endpoint regardless of their role. This feature enforces role-based access control (RBAC) so that `member` users can only read and update their own profile, while `admin` users retain full CRUD access across all users.

## Functional Requirements

- The JWT token payload must expose enough information to identify the current user (their `sub` / user ID or username) and look up their role.
- A `get_current_user` dependency must resolve the authenticated user from the token and return a typed representation (id, role) for use in route handlers.
- A `require_admin` dependency (or equivalent) must enforce that the caller has the `admin` role, raising a `ForbiddenError` otherwise.
- Endpoints restricted to admins only:
  - `GET /users/` — list all users
  - `POST /users/` — create a user
  - `DELETE /users/{user_id}` — delete a user
- Endpoints accessible by both roles, with member self-restriction:
  - `GET /users/{user_id}` — admin can fetch any user; member can only fetch their own
  - `PUT /users/{user_id}` — admin can update any user; member can only update their own
- When a member attempts to access another user's data on a scoped endpoint, a `ForbiddenError` is raised.
- Role enforcement lives in the router layer (injected as a dependency or checked via `get_current_user`). Services must not contain role logic.

## Possible Edge Cases

- Token `sub` field stores username, not user ID — a DB lookup may be needed to resolve the current user's ID and role for comparison.
- A member updating their own profile must not be able to elevate their own role (the `role` field in `UserUpdateSchema` should be ignored or rejected for members).
- If the current user is not found in the DB (e.g. deleted after token was issued), the request should fail with an appropriate auth error, not a 500.
- `require_admin` and `get_current_user` must not duplicate the token validation already done by `verify_token` — they should build on it or replace it cleanly.

## Acceptance Criteria

- A `member` calling `GET /users/` receives `403 Forbidden`.
- A `member` calling `POST /users/` receives `403 Forbidden`.
- A `member` calling `DELETE /users/{user_id}` receives `403 Forbidden`.
- A `member` calling `GET /users/{their_own_id}` receives `200 OK`.
- A `member` calling `GET /users/{other_user_id}` receives `403 Forbidden`.
- A `member` calling `PUT /users/{their_own_id}` receives `200 OK`.
- A `member` calling `PUT /users/{other_user_id}` receives `403 Forbidden`.
- An `admin` can successfully call all endpoints without restriction.
- A `member` cannot change their own role via `PUT /users/{user_id}`.

## Open Questions

- Should `member` users be able to delete their own account, or is delete strictly admin-only? admin only
- Should the `role` field be silently ignored when a member submits it, or should the API return a `403`? Clarify it, otherwise 403 is fine.
- Does `get_current_user` replace `verify_token` in the router dependencies, or do both coexist? I think they both should coexist but I'm not sure.

## Testing Guidelines

Create a test file(s) in the ./tests for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Member is denied access to admin-only endpoints (`GET /users/`, `POST /users/`, `DELETE /users/{id}`)
- Member can read and update their own user record
- Member is denied read/update on another user's record
- Admin can call all endpoints without a 403
- Member cannot escalate their own role via update
