# Spec for Admin and Member Endpoint Separation

branch: FT-21_admin-member-endpoint-separation

## Summary

A member user can currently self-escalate to admin by sending `role: admin` in `PUT /users/{user_id}`. This is possible because `VerifyOwnership` grants members access to their own profile update, and `UserUpdateSchema` includes the `role` field with no restrictions at the service layer.

The fix splits the single user router into two routers with distinct responsibilities and access levels:

- **Admin router** (`/admin/users/...`) — protected by `RequireAdmin`. Handles all CRUD operations including role and `is_active` changes.
- **User router** (`/users/...`) — protected by `VerifyOwnership`. Handles self-service read and profile update, but with a restricted schema that excludes `role` and `is_active`.

## Functional Requirements

- Create a new admin router at prefix `/admin/users` with `RequireAdmin` applied to all routes.
- Move the following endpoints to the admin router:
  - `GET /admin/users/` — list all users
  - `POST /admin/users/` — create a user (with full schema including `role` and `is_active`)
  - `GET /admin/users/{user_id}` — read any user
  - `PUT /admin/users/{user_id}` — update any user (with full schema including `role` and `is_active`)
  - `DELETE /admin/users/{user_id}` — delete any user
- Keep the following self-service endpoints in the user router under `/users` with `VerifyOwnership`:
  - `GET /users/{user_id}` — read own profile
  - `PUT /users/{user_id}` — update own profile
- Introduce a new `UserUpdateSelfSchema` for the self-service `PUT` that excludes `role` and `is_active`. Allowed fields: `username`, `email`, `password`.
- Rename the existing `UserUpdateSchema` → `UserUpdateAdminSchema` (which includes `role` and `is_active`); used in the admin router only.
- Register both routers in `app/main.py`.

## Possible Edge Cases

- An admin calling the self-service `PUT /users/{user_id}` should not be able to change their own role through the non-admin route (this is already blocked by the schema restriction — desired behavior).
- Removing `GET /users/` and `POST /users/` from the user router means those paths no longer exist at the public prefix. Ensure no existing client or test relies on those paths.
- A member with a valid token calling any `/admin/users/...` endpoint must receive a `403 Forbidden`, not a `404`.

## Acceptance Criteria

- `PUT /users/{user_id}` with `role: admin` in the body returns `422 Unprocessable Entity` (field not accepted by schema) or silently ignores the field — the role must not change.
- `PUT /admin/users/{user_id}` with `role: admin` succeeds when called by an admin.
- `PUT /admin/users/{user_id}` called by a member returns `403 Forbidden`.
- `GET /admin/users/`, `POST /admin/users/`, `DELETE /admin/users/{user_id}` all return `403` for member tokens.
- `GET /users/{user_id}` and `PUT /users/{user_id}` remain accessible to the resource owner (member or admin).
- `GET /users/{user_id}` for a different user's ID returns `403` for a member token.

## Open Questions

- Should `GET /users/{user_id}` be kept for admins too via `VerifyOwnership` (which already allows admins), or should admins exclusively use the admin router for reads? Current `VerifyOwnership` allows both — this behaviour can be preserved as-is. `VerifyOwnership` allows both.
- Should `UserUpdateSelfSchema` be a standalone class or derived from `UserUpdateAdminSchema` via field exclusion? → derived from `UserUpdateAdminSchema`

## Testing Guidelines

Create or update test files in `./tests` to cover:

- A member `PUT /users/{user_id}` with `role: admin` does not elevate the role.
- A member `PUT /users/{user_id}` with `username`/`email`/`password` succeeds.
- An admin `PUT /admin/users/{user_id}` with `role: admin` or `is_active: false` succeeds.
- A member calling any `/admin/users/...` endpoint receives `403`.
- An unauthenticated request to any protected endpoint receives `401`.
- `GET /users/{user_id}` by a different member returns `403`.
