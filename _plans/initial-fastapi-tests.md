# Plan: Initial FastAPI Tests (FT-16)

## Context

The app has no test infrastructure. This plan sets up the initial integration test suite covering the two existing routers (`/auth/token` and `/users`). No files in `app/` are modified — only `pyproject.toml`, `pytest` config, and a new `tests/` directory.

---

## Critical findings

- `app/config/database.py` — `engine` is created at import time; `app.dependency_overrides` replaces the session dependency entirely so the real engine is never used in tests
- `app/models/base.py` — `Base.metadata` contains all table definitions; used by `create_all()` to build the test schema
- No Alembic in tests — schema is created via `Base.metadata.create_all()`, seed users are inserted via fixtures

---

## Steps

### 1. `pyproject.toml`

Add a `[test]` dependency group and pytest config:

```toml
[dependency-groups]
test = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "httpx>=0.27",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
pythonpath = ["app"]
```

`pythonpath = ["app"]` adds `app/` to sys.path so imports like `from main import app` work in tests.

Also add to `pyproject.toml` so `uv sync` includes the `test` group by default:

```toml
[tool.uv]
default-groups = ["dev", "test"]
```

---

### 2. `tests/conftest.py`

**Fixtures:**

| Fixture | Scope | What it does |
|---|---|---|
| `db_engine` | `session` | Creates an in-memory SQLite engine with `StaticPool`; runs `Base.metadata.create_all()`, yields, then drops all tables |
| `override_db` | `session` | Creates `async_sessionmaker` from `db_engine`; registers `app.dependency_overrides[get_async_session]` and clears it after; depends on `db_engine` |
| `admin_user` | `session` | Inserts an admin user directly into the test DB via the session; depends on `override_db` |
| `client` | `session` | `async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client: yield client`, depends on `override_db` |
| `admin_token` | `session` | POSTs to `/auth/token` with admin credentials (form data), returns the token string; depends on `client` + `admin_user` |

**`StaticPool`** forces SQLAlchemy to reuse a single connection — without it each new connection gets a fresh in-memory DB and the tables created by `create_all()` would be invisible to the app's session.

**`override_db`** must mirror the original `get_async_session`: auto-commit on success, rollback + raise `ConflictError` on `IntegrityError`.

**Isolation:** tests that create users must use unique usernames/emails (e.g. a `uuid4()` suffix). Tests that delete must only delete users they themselves created.

---

### 3. `tests/test_auth.py`

3 tests for `POST /auth/token` (form data, not JSON):

| Test | Input | Expected |
|---|---|---|
| `test_login_valid` | `username=admin, password=admin` | 200, body has `access_token`, `token_type == "bearer"` |
| `test_login_wrong_password` | `username=admin, password=wrong` | 401 |
| `test_login_unknown_user` | `username=nobody, password=x` | 401 |

---

### 4. `tests/test_users.py`

8 tests for `/users` endpoints:

| Test | Auth | Action | Expected |
|---|---|---|---|
| `test_list_users_authenticated` | yes | GET /users/ | 200, list |
| `test_list_users_no_token` | no | GET /users/ | 401 |
| `test_create_user_valid` | yes | POST /users/ with unique data | 201, body matches |
| `test_create_user_duplicate_email` | yes | POST with admin's email | 409 |
| `test_create_user_duplicate_username` | yes | POST with `username=admin` | 409 |
| `test_get_user_not_found` | yes | GET /users/{random_uuid} | 404 |
| `test_get_user_found` | yes | Create user, GET by returned ID | 200 |
| `test_delete_user` | yes | Create user, DELETE, GET | 204 then 404 |

---

## Files to create/modify

| File | Action |
|---|---|
| `pyproject.toml` | Add `[test]` dep group + `[tool.pytest.ini_options]` |
| `tests/conftest.py` | New — db_engine, override_db, admin_user, client, admin_token fixtures |
| `tests/test_auth.py` | New — 3 auth tests |
| `tests/test_users.py` | New — 8 user endpoint tests |

No changes to `app/` or `alembic/`.

---

## Verification

```bash
uv sync
uv run pytest
```

All tests run in memory — no files created or cleaned up.

---

## If tests fail

- **1st failure** — read the error, fix the root cause, re-run
- **2nd failure on the same test** — stop, re-read the relevant app code to verify assumptions, then fix
- **3rd failure on the same test** — stop and ask rather than guess again
