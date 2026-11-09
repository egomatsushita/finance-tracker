# Spec for Remove Roles (Self-Signup)

branch: FT-45_remove-roles-self-signup

## Summary

The product is dropping the `admin`/`member` role split entirely. There is no longer an admin-managed user list — anyone can create their own account. This removes `role` from the `User` model, the `/admin/users` router, and all role branches in `app/dependencies/auth.py`, and adds a public `POST /auth/signup` endpoint plus a `/signup` frontend page. It supersedes FT-41's "admin-only Users page" scope — that page was never built (`_plans/dashboard.md` still describes it, but no `web/app/.../users/page.tsx` exists yet), so there is nothing to migrate; FT-41 is dropped rather than repurposed.

## Functional Requirements

- **Model**: remove the `role` column from `app/models/user.py` (`Mapped[str]`, currently `default="user"`).
- **Migration**: new Alembic migration (manual, following the `YYYY_MM_DD_HHMM-<hash>_<description>.py` naming convention, `target_metadata = None`) that drops the `role` column from the `users` table. Existing seed migrations (`seed_admin_user`, `seed_members`) are left untouched as history — they still insert `role` at the point in the chain where the column existed.
- **Schemas** (`app/schemas/user.py`):
  - Remove `UserRoleEnum`.
  - Remove `role` from `UserBase`, `UserUpdateBaseSchema`, `UserReadSchema`.
  - Remove `role` from `CurrentUser` (becomes just `id`).
  - Remove `UserUpdateAdminSchema` (no longer has a caller once `/admin/users` is gone).
  - Add a new schema for self-signup (e.g. `UserSignupSchema`): `username`, `email`, `password` only — mirrors `UserUpdateSelfSchema`'s pattern of excluding privileged fields, so a signup request can't set `is_active`.
  - `UserCreateHashSchema`/`UserUpdateHashSchema` keep `hashed_password` but lose `role`.
- **`app/dependencies/auth.py`**:
  - Remove `verify_admin` and `RequireAdmin` entirely.
  - Simplify `verify_ownership` (`VerifyOwnership`) to `current_user.id != user_id` → `ForbiddenError` (drop the `current_user.role != UserRoleEnum.admin and ...` branch — there's no longer a role that can bypass the ownership check).
  - `get_current_user` builds `CurrentUser(id=user.id)` only.
- **Routers**:
  - Delete `app/routers/admin_user.py` and its registration in `app/main.py`. All `/admin/users/*` routes are gone (404, not 403).
  - Add `POST /auth/signup` to `app/routers/auth.py`: public (no auth dependency), takes `UserSignupSchema`, delegates to the existing user service's create path (reusing `UserService.create`/repository, just with the new schema instead of the old admin `UserCreateSchema`), returns `UserReadSchema` (or logs the new user in immediately and returns `LoginResponse` — see Open Questions).
  - `app/routers/user.py` (`/users/me`, `/users/{user_id}`) is otherwise unchanged structurally — `VerifyOwnership` still gates `GET`/`PUT /{user_id}`, just without the admin bypass.
- **Services/Repositories** (`app/services/user.py`, `app/repositories/user.py`): no role-specific logic exists today (role was passed through generically via `model_dump()`), so no changes beyond whatever naturally follows from the schema change (e.g. `UserCreateSchema` references, if any, swapped for `UserSignupSchema`).
- **Frontend**:
  - `web/lib/types.ts`: remove the `UserRole` type and `role` field from `User`.
  - `web/lib/auth.tsx`: add a `signup()` method analogous to `login()` — calls the new signup endpoint, then hydrates/populates `useAuth().user` the same way `login()` does.
  - New `web/app/signup/page.tsx` (`'use client'`), mirroring `web/app/login/page.tsx`'s structure: `username`, `email`, `password` fields validated with `zod` via `react-hook-form`, calls `useAuth().signup(...)`, redirects to `/` on success, shows an inline error on failure (409 conflict for duplicate username/email → "Username or email already taken"; other errors → generic message).
  - Add a link between `/login` and `/signup` (e.g. "Don't have an account? Sign up" / "Already have an account? Log in") so the new page is reachable from the existing one.
  - Update `web/app/(app)/layout.test.tsx:48`'s fixture, which currently stubs `role: 'member'`, to drop that field.

## Possible Edge Cases

- Duplicate `username` or `email` on signup must surface as a `409` (existing `ConflictError` path from the DB unique constraint), not a `500`.
- An open, unauthenticated signup endpoint is inherently abusable (no rate limiting or CAPTCHA exists in this codebase) — out of scope for this ticket, but worth flagging since it's a new unauthenticated write endpoint.
- Password strength/length validation on signup should reuse whatever validation already exists on account creation today (service/schema-level), not introduce new rules.
- Any other reference to `UserRoleEnum`, `CurrentUser.role`, or `current_user.role` elsewhere in the codebase (tests, docs examples) needs a grep sweep before removal — the explore pass found the two call sites in `auth.py`, but a final check before merging is needed.
- `_plans/dashboard.md` still documents the admin-only Users page and role-aware nav (lines ~18, 82, 101, 124, 130, 148-149) — stale after this change; should be updated or flagged, not left silently wrong.
- `is_active` stays on the model/schemas unchanged — it's orthogonal to role removal, even though the only thing that used to let someone else toggle it (`UserUpdateAdminSchema`/`/admin/users`) is going away. There is now no API path to deactivate a user; acceptable for this ticket's scope.

## Acceptance Criteria

- `GET`/`POST`/`PUT`/`DELETE /admin/users/...` all return `404` (route no longer exists).
- `POST /auth/signup` with a new, valid `username`/`email`/`password` creates the user and succeeds.
- `POST /auth/signup` with a `username` or `email` that already exists returns `409`.
- `GET /users/me` and `GET /users/{user_id}` responses no longer include a `role` field.
- A user can still only read/update their own profile via `/users/{user_id}`; a different user's id returns `403` (no admin bypass exists anymore, which is expected — there's no admin).
- `alembic upgrade head` succeeds against a DB seeded by the existing seed migrations, and the `users` table has no `role` column afterward.
- Frontend: `/signup` page exists; `npm run build`, `npm run lint`, and `npm run test` pass with no errors; the `User` type has no `role` field anywhere it's used.
- Submitting the signup form with valid data navigates to `/` with `useAuth().user` populated, consistent with the login flow.

## Open Questions

- Should `POST /auth/signup` auto-login the new user (set session/csrf cookies and return a `LoginResponse`, like `POST /auth/token` does), or just create the account and require a separate login? Recommend auto-login — it matches the login endpoint's cookie-setting behavior and avoids a redundant round trip for the frontend. (Follow the recommended)
- Should `_plans/dashboard.md` be updated in this same PR to drop the admin/Users-page content, or handled as a follow-up doc cleanup? Recommend updating it here since it's directly contradicted by this change and cheap to fix alongside. (Follow the recommended)
- Should `verify_ownership`/`VerifyOwnership` be renamed now that it's a pure "is this me" check with no more admin bypass? Recommend keeping the name as-is to minimize diff — a rename is a separate cleanup, not required by this ticket's scope.

## Testing Guidelines

Create/update test files in `./tests` and `web/`:

- Backend:
  - Delete `tests/routers/test_admin_users.py` (tests routes that no longer exist).
  - Add signup tests in `tests/routers/test_auth.py`: valid signup succeeds; duplicate username → `409`; duplicate email → `409`; missing/invalid fields → `422`; unauthenticated access is allowed (no token required).
  - Update `tests/routers/test_users.py`: remove `test_member_cannot_self_escalate_role` (no role to escalate); confirm `/users/me` and `/users/{user_id}` responses have no `role` key; confirm ownership check still blocks access to another user's record with `403` for a non-matching id.
  - Update `tests/services/test_user_service.py` for any role-related assertions.
- Frontend:
  - New `web/app/signup/page.test.tsx` mirroring `login/page.test.tsx`'s cases: renders fields, empty-field validation blocks submission, successful signup navigates to `/`, duplicate-account error shows inline, generic error on other failures, submit button disabled while pending.
  - Update `web/app/(app)/layout.test.tsx` fixture to drop `role`.
  - Unit test for `web/lib/auth.tsx`'s new `signup()`, mocking the signup request the same way `login()`'s tests mock `loginRequest`.
