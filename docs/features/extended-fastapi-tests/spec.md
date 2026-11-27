# Spec for Extended FastAPI Tests

branch: FT-17_extended-fastapi-tests

## Summary

Extend the existing test suite to cover the remaining untested scenarios across
the auth and user endpoints. No changes to the `app/` directory. All new tests
live in the existing `tests/` folder.

## Functional Requirements

- Extend `tests/test_auth.py` with edge cases for invalid, expired, and malformed tokens
- Extend `tests/test_users.py` with full coverage of the `PUT /users/{user_id}` endpoint
- Add missing 401, 404, and 422 cases to existing endpoint tests
- Add `FilterParams` validation tests to `GET /users/`
- Add field coverage for `is_active` and `role` on the User model
- Add service-level unit tests for `AuthService` pure methods in a new `tests/test_auth_service.py`

## Possible Edge Cases

**Auth / token validation:**
- Invalid/malformed JWT → 401
- Expired JWT → 401
- JWT with no `sub` claim → 401
- Missing `Authorization` header on a protected endpoint → 401

**PUT /users/{user_id}:**
- Successful full update → 200
- Successful partial update (only one field) → 200
- Password update (new password is hashed before storage) → 200
- Non-existent user → 404
- Duplicate email → 409
- Duplicate username → 409
- Invalid `role` value → 422

**GET /users/ — FilterParams validation:**
- `offset < 0` → 422
- `limit > 100` → 422
- `limit < 0` → 422
- Invalid `order_by` value → 422
- `order_by=updated_at` happy path → 200

**Other missing edge cases:**
- `GET /users/{user_id}` unauthenticated → 401
- `DELETE /users/{user_id}` non-existent user → 404
- `DELETE /users/{user_id}` unauthenticated → 401
- `POST /users/` invalid email format → 422
- `POST /users/` missing required fields → 422
- `POST /users/` invalid `role` value → 422

**Model field coverage:**
- Create a user with `is_active=False` and verify it is persisted correctly
- Create a user with `role=admin` and verify it is persisted correctly

## Acceptance Criteria

- `uv run pytest` runs and passes with no warnings from the project root
- Each test is isolated — no shared state between test runs
- All new tests follow the same patterns established in the existing test suite

## Open Questions

- **Service unit tests**: `AuthService` has several pure static/class methods (`encode_jwt`, `decode_jwt`, `calc_expire`, `create_hashed_password`, `verify_password`, `authenticate`). Should these be tested as unit tests (no DB, no HTTP client) in a separate file, or is it sufficient to cover them indirectly through the integration tests? test them as unit tests
- **Expired token test**: generating an already-expired token requires either mocking `datetime.now` or creating a token with a negative `expires_delta`. Create a oken with past exp.

## Testing Guidelines

Create a test file(s) in the ./tests for the new feature, and create meaningful tests for the following cases, without going too heavy:

- `test_auth.py`: add invalid token, expired token, missing `sub`, and missing header cases
- `test_users.py`: add all `PUT /users/{user_id}` cases; add missing 401/404/422 cases for existing endpoints; add `FilterParams` validation cases; add `is_active` and `role` field coverage
- `test_auth_service.py` (new, if service unit tests are in scope): `encode_jwt`/`decode_jwt` roundtrip, `calc_expire` default vs custom delta, `authenticate` with `None` hashed password
