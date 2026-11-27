# Plan: FT-45 — Remove Roles (Self-Signup)

Spec: `_specs/remove-roles-self-signup.md` (already written). This plan implements it.

## Context

The product is dropping the `admin`/`member` role split. There's no admin-managed user list — anyone can create their own account. This removes `role` everywhere it exists (model, schemas, auth dependencies, the `/admin/users` router) and adds a public, auto-logging-in `POST /auth/signup`. It supersedes FT-41's "admin-only Users page," which was never built, so there's nothing to migrate on the frontend beyond deleting the `role` field from the `User` type.

Decisions confirmed with the user:
- `POST /auth/signup` auto-logs in the new user (sets the same `session`/`csrf_token` cookies as `/auth/token`), rather than requiring a second login call.
- Stale docs (`CLAUDE.md`'s "Roles" paragraph, `app/docs/user.py`'s role examples, `_plans/dashboard.md`'s admin/Users-page content) are fixed in this same PR.
- `verify_ownership`/`VerifyOwnership` keeps its name — it's still an identity/ownership check, just without the admin bypass branch. No rename.

## Backend changes

**`app/models/user.py`** — remove the `role` column (`Mapped[str]`, `default="user"`).

**New Alembic migration** `alembic/versions/`, named `<today>-<hash>_drop_user_role.py`, `down_revision = "d82b574a14fc"` (current head):
- `upgrade()`: `op.drop_column("user", "role")`
- `downgrade()`: `op.add_column("user", sa.Column("role", sa.String(32), nullable=False, server_default="user"))` — mirrors the original definition in `2026_03_09_1402-9c25eea42330_add_user_table.py:30`.
- Leave `seed_admin_user`/`seed_members` migrations untouched as history.

**`app/schemas/user.py`**:
- Remove `UserRoleEnum`.
- Remove `role` from `UserBase`, `UserUpdateBaseSchema`, `UserReadSchema`, `CurrentUser` (→ just `id`).
- Remove `UserUpdateAdminSchema` (no caller once `/admin/users` is gone).
- Repurpose `UserCreateSchema` into a signup-only shape: drop `role` (via `UserBase`) and also drop `is_active` — a public signup request must not be able to set it. Give it its own three fields (`username`, `email`, `password`) rather than inheriting `UserBase`, same pattern `UserUpdateSelfSchema` already uses to exclude privileged fields. Rename to `UserSignupSchema` for clarity at the call site.
- `UserCreateHashSchema`/`UserUpdateHashSchema` keep `hashed_password`, lose `role`.

**`app/dependencies/auth.py`**:
- Delete `verify_admin` and `RequireAdmin`.
- `verify_ownership`: drop the `current_user.role != UserRoleEnum.admin and ...` clause — becomes `if current_user.id != user_id: raise ForbiddenError()`.
- `get_current_user` builds `CurrentUser(id=user.id)`.

**Routers**:
- Delete `app/routers/admin_user.py`; remove its import/registration in `app/main.py:8,27`.
- `app/routers/auth.py` — add `POST /auth/signup`:
  - Public (no auth dependency), body = `UserSignupSchema`.
  - Depends on both the user service and `AuthService` (two `ServiceDep` aliases, same DI pattern as elsewhere).
  - Calls `user_service.create(signup_data)` → `UserReadSchema`; on success, call `AuthService.create_access_token(new_user.username)` directly (reuses the exact helper `login()` already uses at `auth.py:39`, skipping password verification since the account was just created), then `_set_auth_cookies(response, access_token)` (existing helper, `auth.py:31-36`), and return `LoginResponse(detail="ok")` — mirrors `login()`'s shape exactly (`auth.py:46-63`).
  - `UserAlreadyExistError` (raised by `user_service.create()` on duplicate username/email) is already mapped to `409` via `exception_handlers.py` — no new error handling needed.
- `app/routers/user.py` unchanged structurally — `VerifyOwnership` still gates `GET`/`PUT /{user_id}`, just without the admin bypass underneath.

**`app/services/user.py`**: `create()`'s parameter type changes from `UserCreateSchema` to `UserSignupSchema`; `update()`'s union type drops `UserUpdateAdminSchema`. No other logic changes — role was always passed through generically.

## Documentation changes

- **`app/docs/user.py`**: remove `role` from `user_create_example`/`user_update_admin_example` (or delete the latter entirely if it's no longer referenced), and the admin/role prose in the `create` endpoint description (OpenAPI-facing — the API's public docs must not reference `role` or `/admin/users` once they're gone). Add a signup endpoint doc entry following the existing dict-based pattern, unpacked into `POST /auth/signup`'s route decorator same as other endpoints.
- **`CLAUDE.md`**: rewrite the "Roles" convention paragraph — there's no more admin/member split, no `/admin/users`, no `RequireAdmin`. Describe the new reality: any user can self-register via `POST /auth/signup`; `VerifyOwnership` just checks caller id == resource id; `role` no longer exists on the `User` model.
- **`_plans/dashboard.md`**: strip the admin-only Users page and role-aware nav content (the lines referencing `/admin/users`, "Users (admin only)", role-aware sidebar, and the "Users" entry in the route table) so the plan doc stops describing a feature that's being removed.
- **`.claude/agent-memory/code-quality-reviewer/project_rbac_patterns.md`**: update so the reviewer agent doesn't flag the removed RBAC patterns (role checks, admin bypass) as regressions on future diffs that touch `app/dependencies/auth.py` or `app/routers/user.py`.
- **`_specs/admin-member-endpoint-separation.md`** and **`_specs/user-role-permissions.md`**: no edit needed — these stay as historical specs for context, same convention as the untouched seed migrations.

## Frontend changes

- `web/lib/types.ts`: remove `UserRole` type and `role` field from `User`.
- `web/lib/api.ts`: add `signupRequest()` alongside the existing `loginRequest`/`logoutRequest` (`api.ts:105-124`), same shape (POST, parses response/throws `ApiError`).
- `web/lib/auth.tsx`: add `signup()` mirroring `login()` (`auth.tsx:41-49`) — calls `signupRequest()`, then the same `hydrate()`/`getWithAuthHandling('/users/me', true)` step to populate `user`.
- New `web/app/signup/page.tsx` (`'use client'`), structurally mirroring `web/app/login/page.tsx`:
  - Fields: `username`, `email`, `password`, zod-validated via `react-hook-form`.
  - Calls `useAuth().signup(...)`; on success, `useRouter().push('/')`.
  - On failure: `ApiError` with `status === 409` → "Username or email already taken"; anything else → generic "Something went wrong" message. Same disabled/loading submit pattern as login.
- Add a reciprocal link between `/login` and `/signup` ("Don't have an account? Sign up" / "Already have an account? Log in").
- `web/app/(app)/layout.test.tsx:48`: drop `role: 'member'` from the fixture object.

## Test changes

- Delete `tests/routers/test_admin_users.py` (tests routes that no longer exist; confirmed no other test file imports fixtures from it).
- `tests/conftest.py`: remove `role="admin"`/`role="member"` kwargs from the `admin_user` (line ~64) and `member_user` (line ~99) fixture constructors — both become plain users. Fixture names can stay (still useful as "two distinct users" for ownership tests) even though the admin/member distinction is gone.
- `tests/routers/test_auth.py`: add signup tests mirroring its existing login/logout test patterns — valid signup succeeds and sets cookies; duplicate username → `409`; duplicate email → `409`; missing/invalid fields → `422`; no auth required.
- `tests/routers/test_users.py`:
  - Remove `test_member_cannot_self_escalate_role` (lines 63-71) — `role` no longer exists anywhere to escalate to; this isn't a case the schema needs to guard against anymore (though `UserUpdateSelfSchema`'s `extra="forbid"` will still 422 unknown fields in general, which is a different, already-covered guarantee).
  - Consider dropping `test_admin_can_read_own_profile_via_me` (lines 97-105) as redundant with the member equivalent now that there's no role distinction — or keep it as plain extra coverage of a second user; not load-bearing either way.
- `tests/services/test_user_service.py`: no role assertions exist — verify it still passes with the new `UserSignupSchema` param type on `create()`.
- Frontend: new `web/app/signup/page.test.tsx` mirroring `web/app/login/page.test.tsx`'s structure (field rendering, empty-field validation, successful-submit navigation, 409-conflict inline error, generic-error inline message, disabled/pending submit state). New unit test for `web/lib/auth.tsx`'s `signup()`, mocking `signupRequest` the same way existing tests mock `loginRequest`.

## Verification

- Backend: `uv run alembic upgrade head` against a fresh DB succeeds; `uv run pytest` passes, including new signup tests and the updated `test_users.py`/`conftest.py`.
- Manually: `POST /auth/signup` with a fresh username/email/password returns `200` with cookies set; repeating it returns `409`; `GET /users/me` with the new session cookie returns the created user with no `role` key.
- Frontend: `npm run build`, `npm run lint`, `npm run test` all pass. Manually load `/signup`, submit a new account, confirm redirect to `/` with the user populated; try a duplicate username and confirm the inline "already taken" message.
