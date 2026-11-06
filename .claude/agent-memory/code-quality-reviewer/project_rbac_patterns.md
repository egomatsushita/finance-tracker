---
name: RBAC removal (FT-45)
description: The admin/member role system and /admin/users router were removed entirely in FT-45 — do not flag their absence as a regression
type: project
---

As of FT-45 (2026-11-06), the role system described by earlier versions of this memory no longer exists:

- `UserRoleEnum`, `role` (model column, all schemas), `CurrentUser.role`, `verify_admin`/`RequireAdmin`, `admin_user_router` (`/admin/users`), and `UserUpdateAdminSchema`/old `UserCreateSchema` are all **gone**, not missing by accident.
- `verify_ownership`/`VerifyOwnership` (`app/dependencies/auth.py`) is now a pure `current_user.id == user_id` check — there is no admin bypass to verify anymore.
- Any user can create their own account via the public `POST /auth/signup` (`UserSignupSchema`: `username`, `email`, `password`), which also logs them in. There is no admin-managed user creation/listing/deletion.
- `tests/routers/test_admin_users.py` was deleted; `tests/conftest.py`'s `admin_user`/`member_user` fixtures are now just two plain users with no `role` kwarg (names kept for minimal diff, not because a distinction remains).

**Why:** The product dropped the admin/member split in favor of open self-signup. Prior memory entries about role escalation, router-level vs. per-route `RequireAdmin`/`VerifyOwnership` placement, and `UserUpdateAdminSchema`/`UserUpdateSelfSchema` type-annotation mismatches no longer apply — those symbols don't exist.
**How to apply:** On any diff touching `app/dependencies/auth.py`, `app/routers/user.py`, `app/routers/auth.py`, or `app/schemas/user.py`, do not expect or request role/admin-bypass logic. The only identity check left to verify is that `verify_ownership` still compares `current_user.id` to the path's `user_id`.

**Known gap left by the FT-45 removal (confirmed still present as of 2026-11-06, not yet fixed):** deleting `admin_user_router` removed its only callers but not the now-dead code paths underneath it: `UserService.get_all()`/`.delete()`, `UserRepository.get_all()`/`.delete()`, and `FilterParamsDep` (`app/dependencies/params.py`) are unreachable from any router. `UserUpdateBaseSchema.is_active` / `UserUpdateHashSchema.hashed_password`'s `is_active` field is similarly dead since `UserUpdateSelfSchema` (the only schema ever passed into `UserService.update()`) has no `is_active` field at all. Flag as a suggestion (not blocking) if a future diff touches `app/services/user.py`, `app/repositories/user.py`, or `app/dependencies/params.py` without cleaning these up — each still has direct unit-test coverage (e.g. `TestDelete` in `tests/services/test_user_service.py`), so it isn't failing silently, just unreachable from the API surface.
