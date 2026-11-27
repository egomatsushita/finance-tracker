# Plan: Current User Endpoint (FT-31)

Spec: `_specs/current-user-endpoint.md`

## Context
Frontend needs to resolve its own id/role after login via `GET /users/me`. `user_router` currently applies `VerifyOwnership` at the router level, which requires a `user_id` path param — incompatible with a parameter-less `/me` route. Fix: move `VerifyOwnership` to per-route on the two existing `{user_id}` routes, then add `/me` without it. TDD: tests first, confirming both the new endpoint and that existing ownership checks on `{user_id}` routes are unaffected by the refactor.

## Files touched
- `app/routers/user.py` — router dependency refactor + new route
- `tests/routers/test_users.py` — new tests appended (reuses existing fixtures)

## Step 1 — Tests first (red)
Append to `tests/routers/test_users.py` (reuses `client`, `member_token`, `member_user`, `admin_token`, `admin_user` fixtures from `conftest.py`):

1. `test_member_can_read_own_profile_via_me` — `GET /users/me` with `member_token` → `200`, `response.json()["username"] == "member"` and `response.json()["id"] == str(member_user.id)`.
2. `test_admin_can_read_own_profile_via_me` — `GET /users/me` with `admin_token` → `200`, `response.json()["username"] == "admin"`.
3. `test_get_me_unauthenticated` — `GET /users/me` with no `Authorization` header → `401`.
4. `test_get_me_not_shadowed_by_user_id_route` — implicit in test 1/2 passing with `200` (not a UUID-parse 422); no separate assertion needed beyond that.
5. Regression — re-run existing `test_member_cannot_read_other_user` / `test_member_cannot_update_other_user` (already in the file) after the refactor to confirm `403` behavior is preserved; no new test needed, just must still pass.

Run `uv run pytest tests/routers/test_users.py` — the four new tests fail (route doesn't exist yet / 404s).

## Step 2 — Implement (green)
In `app/routers/user.py`:
1. Change `user_router = APIRouter(prefix="/users", tags=["users"], dependencies=[VerifyOwnership])` → `user_router = APIRouter(prefix="/users", tags=["users"])` (drop the router-level dependency).
2. Add `dependencies=[VerifyOwnership]` to the `@user_router.get("/{user_id}", ...)` and `@user_router.put("/{user_id}", ...)` decorators individually.
3. Add, declared **before** the `/{user_id}` routes:
   ```python
   @user_router.get(
       "/me",
       status_code=200,
       **user_endpoints["get_me"],
       response_model=UserReadSchema,
   )
   async def read_current_user(
       current_user: CurrentUserDep, service: ServiceDep
   ) -> UserReadSchema:
       """
       Retrieve the authenticated caller's own profile.
       """
       return await service.get_by_id(current_user.id)
   ```
   Import `CurrentUserDep` from `dependencies.auth` (alongside the existing `VerifyOwnership` import).
4. Add a `"get_me"` entry to `user_endpoints` in `app/docs/user.py` (summary: "Get the current user", description: "Retrieve the authenticated caller's own profile.").
5. Run `uv run pytest tests/routers/test_users.py` until green, then `uv run pytest` for the full suite (confirms the per-route dependency move didn't break `test_admin_users.py` or anything else that imports `user_router`).

## Step 3 — Commit
One commit: `[FT-31] feat: add GET /users/me endpoint`.

## Verification
- `uv run pytest tests/routers/test_users.py -v` passes, including both new `/me` tests and the pre-existing ownership tests.
- `uv run pytest` (full suite) passes.
- Manual sanity check (optional): start the server, log in as member and as admin via `/auth/token`, call `GET /users/me` with each token, confirm each gets their own record and not a 422/404.
