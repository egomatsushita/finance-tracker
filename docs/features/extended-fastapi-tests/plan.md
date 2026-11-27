# Plan: Extended FastAPI Tests (FT-17)

## Context

The initial test suite (FT-16) covered the happy paths and basic error cases for auth and user endpoints. This plan extends coverage to the remaining untested scenarios identified in the spec: the full `PUT /users/{user_id}` endpoint, token validation edge cases, input validation (422s), missing 401/404 cases, FilterParams validation, model field coverage, and AuthService unit tests.

No changes to `app/`. All work is in `tests/`.

---

## Files to modify / create

- `tests/test_auth.py` — extend with token edge cases
- `tests/test_users.py` — extend with PUT tests, missing edge cases, FilterParams, field coverage
- `tests/test_auth_service.py` — new file for AuthService pure-method unit tests

---

## Expired token approach

Encode a JWT directly with a past `exp` datetime, bypassing `create_access_token`:
```python
AuthService.encode_jwt({"sub": "user", "exp": datetime(2000, 1, 1, tzinfo=timezone.utc)})
```
No mocking needed.

---

## Test additions

### tests/test_auth.py

| Test | Scenario | Expected |
|---|---|---|
| `test_invalid_token` | Garbage string as Bearer token on protected endpoint | 401 |
| `test_expired_token` | JWT with past `exp` | 401 |
| `test_token_missing_sub` | JWT with no `sub` claim | 401 |
| `test_missing_auth_header` | Protected endpoint with no Authorization header | 401 |

### tests/test_users.py

**PUT /users/{user_id}:**

| Test | Scenario | Expected |
|---|---|---|
| `test_update_user_full` | Update all fields | 200 |
| `test_update_user_partial` | Update only one field | 200 |
| `test_update_user_password` | Update password; verify new password works for login | 200 |
| `test_update_user_not_found` | Random UUID | 404 |
| `test_update_user_duplicate_email` | Email already taken | 409 |
| `test_update_user_duplicate_username` | Username already taken | 409 |
| `test_update_user_invalid_role` | `role="superadmin"` | 422 |

**GET /users/ — FilterParams:**

| Test | Scenario | Expected |
|---|---|---|
| `test_list_users_offset_negative` | `offset=-1` | 422 |
| `test_list_users_limit_too_high` | `limit=101` | 422 |
| `test_list_users_limit_negative` | `limit=-1` | 422 |
| `test_list_users_invalid_order_by` | `order_by=name` | 422 |
| `test_list_users_order_by_updated_at` | `order_by=updated_at` | 200 |

**Missing 401/404/422s:**

| Test | Scenario | Expected |
|---|---|---|
| `test_get_user_unauthenticated` | GET /users/{id} without token | 401 |
| `test_delete_user_not_found` | DELETE with random UUID | 404 |
| `test_delete_user_unauthenticated` | DELETE without token | 401 |
| `test_create_user_invalid_email` | POST with `email="not-an-email"` | 422 |
| `test_create_user_missing_fields` | POST with empty body `{}` | 422 |
| `test_create_user_invalid_role` | POST with `role="superadmin"` | 422 |

**Field coverage:**

| Test | Scenario | Expected |
|---|---|---|
| `test_create_user_inactive` | Create with `is_active=False` | 201; response has `is_active=False` |
| `test_create_user_admin_role` | Create with `role="admin"` | 201; response has `role="admin"` |

### tests/test_auth_service.py (new)

Pure unit tests — no DB, no HTTP client. Import `AuthService` directly.

| Test | What it covers |
|---|---|
| `test_hash_and_verify_password` | Hash then verify returns `True` |
| `test_verify_wrong_password` | Verify wrong password returns `False` |
| `test_encode_decode_jwt_roundtrip` | Encode then decode returns same claims |
| `test_calc_expire_default` | No delta → ~15 min from now |
| `test_calc_expire_custom` | Custom delta → correct expiry |
| `test_authenticate_valid` | Correct plain password → `True` |
| `test_authenticate_wrong_password` | Wrong plain password → `False` |
| `test_authenticate_none_hashed_password` | `hashed_password=None` → `False` (timing attack guard) |

---

## Patterns to follow (from existing tests)

- Async test functions with `asyncio_mode = "auto"` (no decorator needed)
- Unique usernames/emails: `uuid4().hex[:8]` suffix
- Auth header: `{"Authorization": f"Bearer {admin_token}"}`
- Fixtures: `client: AsyncClient`, `admin_token: str`, `admin_user`
- Assertions: `assert response.status_code == X`, then `body = response.json()`

---

## Verification

```bash
uv run pytest
```

All existing and new tests should pass with no warnings.
