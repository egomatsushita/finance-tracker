# Plan: Admin and Member Endpoint Separation (FT-21)

## Context

A member can self-escalate to admin by sending `{"role": "admin"}` in `PUT /users/{user_id}`. This works because `VerifyOwnership` grants members access to their own profile update, and `UserUpdateSchema` includes `role` with no restrictions in the service layer.

The fix splits the single user router into an admin router (`/admin/users`, `RequireAdmin`) and a self-service router (`/users`, `VerifyOwnership`). The self-service PUT uses a new restricted schema that excludes `role` and `is_active`. No service or repository changes needed.

---

## 1. `app/schemas/user.py` — Restructure Update Schema Hierarchy

Rename and restructure the existing update schemas into a three-level chain:

```
UserUpdateSelfSchema    username, email, password (all optional) — member self-service
    └── UserUpdateAdminSchema   adds role, is_active — admin full update
```

Add `model_config = ConfigDict(extra="forbid")` to `UserUpdateSelfSchema` so FastAPI returns 422 if a member sends `role` or `is_active`.

`UserUpdateHashSchema` is the internal service-layer schema. It stays independent (not part of the above chain) — it carries `username`, `email`, `hashed_password`, `role`, `is_active` as before.

**Concrete changes:**
- Rename `UserUpdateSchema` → `UserUpdateAdminSchema` and add `role`, `is_active` (unchanged fields)
- Add `UserUpdateSelfSchema(BaseModel)` with `extra="forbid"`, fields: `username`, `email`, `password`; make `UserUpdateAdminSchema` extend it
- `UserUpdateHashSchema` is unchanged

---

## 2. `app/routers/admin_user.py` — New File

New router: `prefix="/admin/users"`, `tags=["admin-users"]`. All 5 CRUD endpoints, all under `dependencies=[RequireAdmin]`:

| Method | Path | Body schema | Notes |
|--------|------|-------------|-------|
| GET | `/` | — | reuse `FilterParamsDep` |
| POST | `/` | `UserCreateSchema` | |
| GET | `/{user_id}` | — | |
| PUT | `/{user_id}` | `UserUpdateAdminSchema` | full schema incl. role, is_active |
| DELETE | `/{user_id}` | — | 204 |

Reuse `user_endpoints` and `user_create_example`/`user_update_example` from `app/docs/user.py`.

---

## 3. `app/routers/user.py` — Trim to Self-Service Only

Remove `GET /`, `POST /`, `DELETE /{user_id}` (moved to admin router).

Keep:
- `GET /{user_id}` — `VerifyOwnership`, unchanged
- `PUT /{user_id}` — `VerifyOwnership`, change body type from `UserUpdateAdminSchema` → `UserUpdateSelfSchema`

Update the PUT Body example to use a new `user_update_self_example` (see step 4).

Remove unused imports: `RequireAdmin`, `FilterParamsDep`, `UserCreateSchema`, `UserUpdateAdminSchema`.

---

## 4. `app/docs/user.py` — Add Self-Update Example

Add `user_update_self_example` dict with only `username`, `email`, `password` (no `role` or `is_active`). Used as the Body example on the self-service PUT.

---

## 5. `app/main.py` — Register Admin Router

```python
from routers.admin_user import admin_user_router
app.include_router(admin_user_router)   # before user_router
app.include_router(user_router)
```

---

## 6. `tests/routers/test_users.py` — Update Paths and Tests

**URL path updates** — admin-only operations move to `/admin/users/...`:
- All `POST /users/` → `POST /admin/users/`
- All `GET /users/` (list) → `GET /admin/users/`
- All `DELETE /users/{user_id}` → `DELETE /admin/users/{user_id}`
- Admin `GET /users/{user_id}` (in `test_get_user_found`) → `GET /admin/users/{user_id}`
- Admin `PUT /users/{user_id}` (in update tests) → `PUT /admin/users/{user_id}`

**Self-service paths unchanged:** `GET /users/{user_id}` and `PUT /users/{user_id}` stay as-is for member tests and `test_admin_can_read_any_user_profile`.

**Delete:** `test_member_can_update_own_role` (lines 500–510) — placeholder for the known bug; remove entirely.

**Add new tests:**
1. `test_member_cannot_self_escalate_role` — `PUT /users/{member_user.id}` with `{"role": "admin"}` → expect 422
2. `test_member_cannot_send_is_active` — `PUT /users/{member_user.id}` with `{"is_active": false}` → expect 422
3. `test_admin_can_update_user_role` — `PUT /admin/users/{user_id}` with `{"role": "admin"}` → expect 200, `role == "admin"`
4. `test_admin_can_deactivate_user` — `PUT /admin/users/{user_id}` with `{"is_active": false}` → expect 200, `is_active == false`

---

## Critical Files

| File | Action |
|------|--------|
| `app/schemas/user.py` | Modify — add `UserUpdateSelfSchema`, rename `UserUpdateSchema` → `UserUpdateAdminSchema`, chain from it |
| `app/docs/user.py` | Modify — add `user_update_self_example` |
| `app/routers/admin_user.py` | **Create** — new admin router |
| `app/routers/user.py` | Modify — trim to 2 self-service endpoints |
| `app/main.py` | Modify — register `admin_user_router` |
| `tests/routers/test_users.py` | Modify — path updates, remove 1 test, add 4 tests |

## Verification

```bash
uv run pytest tests/routers/test_users.py -v
```

All existing tests should pass (minus the 1 deleted), plus 4 new ones pass.
