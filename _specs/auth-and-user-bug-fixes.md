# Spec for Auth and User Bug Fixes

branch: FT-19_auth-and-user-bug-fixes

## Summary

Two bugs surface in the test suite. First, `verify_token` only catches `InvalidTokenError`, but a JWT missing the `sub` claim causes `TokenPayload.model_validate()` to raise a Pydantic `ValidationError`, which is unhandled and leaks as a 500. Second, `UserRepository.update()` omits `session.flush()` after setting attributes, so unique-constraint `IntegrityError`s are only raised at commit time — after the response has already started being sent — making them uncatchable by the service layer.

## Functional Requirements

- `verify_token` must return a 401 Unauthorized response for any JWT that is structurally valid but missing the `sub` claim, rather than raising an unhandled `ValidationError`.
- `UserRepository.update()` must flush the session immediately after applying field changes, so `IntegrityError`s are raised before the service layer returns, mirroring the behaviour of `UserRepository.create()`.

## Possible Edge Cases

- A JWT with `sub` set to `null` (JSON null) should also be treated as missing and result in a 401.
- Flushing in `update()` raises `IntegrityError` for duplicate email *and* duplicate username — both must be caught and mapped to a meaningful HTTP error in the service layer (likely 409 Conflict).
- Other repositories that call `update()` equivalents should be audited to confirm they also flush; this spec covers only `UserRepository`.

## Acceptance Criteria

- `test_token_missing_sub` passes: a token with no `sub` claim returns 401.
- `test_update_user_duplicate_email` passes: updating a user to an already-taken email returns a 4xx (not 500) response.
- `test_update_user_duplicate_username` passes: updating a user to an already-taken username returns a 4xx (not 500) response.
- No existing passing tests are broken.

## Open Questions

- Should `sub: str | None = None` be preferred over catching `ValidationError`, to keep `verify_token` focused on token-level errors only? yes
- Should the duplicate-field conflict in `update()` raise a domain exception (e.g. `DuplicateFieldError`) and be mapped in `exception_handlers.py`, consistent with how `create()` conflicts are handled? yes

## Testing Guidelines

Tests already exist (`test_token_missing_sub`, `test_update_user_duplicate_email`, `test_update_user_duplicate_username`). Ensure the following cases are covered or remain covered:

- Token with missing `sub` → 401
- Token with `sub` set to null → 401
- Update user with duplicate email → 409 (or appropriate 4xx)
- Update user with duplicate username → 409 (or appropriate 4xx)
- Valid update (no conflict) still succeeds → 200
