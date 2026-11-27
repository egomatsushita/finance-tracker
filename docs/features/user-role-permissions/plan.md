# Plan: User Role Permissions (FT-20)

## Context

All authenticated users currently have equal access to every `/users` endpoint — `member` and `admin` roles exist on the model but are never checked. This change enforces RBAC so that members can only read/update their own profile, while admins retain full CRUD across all users.

The spec (`_specs/user-role-permissions.md`) has been reviewed. Open questions resolved:
- Delete is **admin-only** (no member self-delete)
- Member submitting a `role` field → **403 ForbiddenError**
- `verify_token` and `get_current_user` **coexist**: `verify_token` stays intact for routes that need auth but not user context; the user router switches entirely to the new dependencies

Note: `UserRoleEnum` enum values are `admin = "admin"` and `member = "member"`, but the `User` model DB default is `"user"` (not `"member"`). This pre-existing inconsistency is out of scope — plan uses enum values as-is.

---

## Implementation Steps

### 1. Add `ForbiddenError` — `app/errors/auth.py`

Append below `CredentialError`:

```python
class ForbiddenError(AuthError):
    def __init__(self):
        super().__init__("You do not have permission to perform this action.")
```

### 2. Register 403 handler — `app/exception_handlers.py`

- Add `ForbiddenError` to the import from `errors.auth`
- Add handler inside `register_exception_handlers`:

```python
@app.exception_handler(ForbiddenError)
async def forbidden_error_handler(req: Request, exc: ForbiddenError):
    raise HTTPException(status_code=403, detail=str(exc))
```

### 3. Add `CurrentUser` schema — `app/schemas/user.py`

Append at the bottom of `schemas/user.py` — `CurrentUser` is a projection of a user (id + role) and `UserRoleEnum` already lives here, so no cross-schema import is needed:

```python
class CurrentUser(BaseModel):
    id: UUID
    role: UserRoleEnum
```

Carries only what auth checks need: `id` for ownership comparisons, `role` for permission gates.

### 4. Add `get_current_user`, `get_admin_user`, type aliases — `app/dependencies/auth.py`

`verify_token` stays **unchanged**.

Extract a private `_decode_username(token) -> str` helper used by both `verify_token` and `get_current_user` to eliminate duplication:

```python
def _decode_username(token: str) -> str:
    try:
        payload = AuthService.decode_jwt(token)
        token_payload = TokenPayload.model_validate(payload)
        username = token_payload.sub
        if username is None:
            raise CredentialError()
        return username
    except InvalidTokenError:
        raise CredentialError()
```

Refactor `verify_token` to call `_decode_username`, and build `get_current_user` on top of it.

Role is kept DB-authoritative (not stored in the JWT) so that role changes take effect immediately without waiting for token expiry.

The user lookup is routed through `UserService` to respect the layered architecture. Add a `get_by_username_or_none` method to `UserService` that returns `User | None` without raising — the dependency handles the missing-user case as `CredentialError` (401), not 404.

New imports needed in `app/dependencies/auth.py`:
- `from dependencies.database import SessionDep`
- `from errors.auth import CredentialError, ForbiddenError`
- `from schemas.user import CurrentUser, UserRoleEnum`
- `from services.user import UserService`

New functions and aliases to append:

```python
async def get_current_user(token: TokenDep, session: SessionDep) -> CurrentUser:
    username = _decode_username(token)
    service = UserService(session)
    user = await service.get_by_username_or_none(username)
    if user is None:
        raise CredentialError()   # deleted-after-token-issued → 401, not 404
    return CurrentUser(id=user.id, role=user.role)


async def get_admin_user(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if current_user.role != UserRoleEnum.admin:
        raise ForbiddenError()
    return current_user


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
AdminUserDep = Annotated[CurrentUser, Depends(get_admin_user)]
```

### 5. Rewrite `app/routers/user.py`

**Router-level change:** Remove `dependencies=[Depends(verify_token)]` from `APIRouter(...)`. Auth is now handled per-route via typed parameters.

**Import changes:**
- Remove `from dependencies.auth import verify_token`
- Add `from dependencies.auth import AdminUserDep, CurrentUserDep`
- Add `from errors.auth import ForbiddenError`
- Add `UserRoleEnum` to the `schemas.user` import

**Route changes:**

| Route | Dep | Enforcement |
|---|---|---|
| `GET /users/` | `_: AdminUserDep` | admin only |
| `POST /users/` | `_: AdminUserDep` | admin only |
| `GET /users/{user_id}` | `current_user: CurrentUserDep` | inline: `current_user.id != user_id` → 403 (unless admin) |
| `PUT /users/{user_id}` | `current_user: CurrentUserDep` | inline: ownership check + `data.role is not None` → 403 (unless admin) |
| `DELETE /users/{user_id}` | `_: AdminUserDep` | admin only |

`PUT` inline logic:
```python
is_admin = current_user.role == UserRoleEnum.admin
if not is_admin and current_user.id != user_id:
    raise ForbiddenError()
if not is_admin and data.role is not None:
    raise ForbiddenError()
```

`data.role is not None` correctly distinguishes "field omitted" (allowed) from "field explicitly sent" (forbidden for members), consistent with the existing `exclude_unset=True` pattern in the service.

---

## Critical Files

- `app/errors/auth.py` — add `ForbiddenError`
- `app/exception_handlers.py` — register 403 handler
- `app/schemas/user.py` — add `CurrentUser`
- `app/services/user.py` — add `get_by_username_or_none` (returns `User | None`, no raise)
- `app/dependencies/auth.py` — add `_decode_username` helper, refactor `verify_token`, add `get_current_user` / `get_admin_user` / type aliases
- `app/routers/user.py` — wire deps per-route, add inline checks

---

## Verification

1. Start the dev server: `uv run app/main.py`
2. Obtain tokens for an admin user and a member user via `POST /auth/token`
3. With the member token, confirm:
   - `GET /users/` → 403
   - `POST /users/` → 403
   - `DELETE /users/{any_id}` → 403
   - `GET /users/{own_id}` → 200
   - `GET /users/{other_id}` → 403
   - `PUT /users/{own_id}` (no role field) → 200
   - `PUT /users/{own_id}` (with `"role": "admin"`) → 403
   - `PUT /users/{other_id}` → 403
4. With the admin token, confirm all endpoints return expected success responses
