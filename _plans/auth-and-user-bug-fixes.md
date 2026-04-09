# Plan: Auth and User Bug Fixes (FT-19)

## Context
Two failing tests expose gaps in error handling:
1. `test_token_missing_sub` — a JWT with no `sub` claim causes `TokenPayload.model_validate()` to raise a Pydantic `ValidationError` (unhandled → 500) because `sub: str` is required.
2. `test_update_user_duplicate_email` / `test_update_user_duplicate_username` — `UserRepository.update()` never calls `flush()`, so the `IntegrityError` surfaces at commit time, after `UserService.update()`'s `try/except` block has already exited → 500 instead of 409.

Both fixes are small and isolated.

---

## Fix 1 — TokenPayload: make `sub` optional

**File:** `app/schemas/auth.py:12`

Change:
```python
sub: str
```
To:
```python
sub: str | None = None
```

This lets `model_validate()` succeed even when `sub` is absent. The existing `if username is None: raise CredentialError()` guard in `app/dependencies/auth.py:28-29` already handles the None case, producing a 401. No changes needed to `verify_token`.

---

## Fix 2 — UserRepository.update(): add flush

**File:** `app/repositories/user.py` — `update()` method (currently ends at line 109)

After the `setattr` loop, add:
```python
await self.session.flush()
```

This mirrors `create()` (line 86) and ensures `IntegrityError` is raised before the method returns, so `UserService.update()`'s existing `except IntegrityError → raise UserAlreadyExistError()` block (lines 115–118) catches it and returns 409. No changes needed in the service or exception handlers — the mapping is already in place.

---

## Critical Files

| File | Change |
|------|--------|
| `app/schemas/auth.py` | `sub: str` → `sub: str | None = None` |
| `app/repositories/user.py` | add `await self.session.flush()` after setattr loop in `update()` |

No new files. No changes to services, error classes, or exception handlers.

---

## Verification

Run the three previously-failing tests:
```bash
uv run pytest tests/test_auth.py::test_token_missing_sub tests/test_users.py::test_update_user_duplicate_email tests/test_users.py::test_update_user_duplicate_username -v
```

Then run the full suite to confirm no regressions:
```bash
uv run pytest
```
