# Spec for Centralized Application Logging

branch: FT-26_centralized-logging

## Summary
Add a centralized logging configuration to the application covering two concerns: security events (authentication failures, forbidden access) and operational events (transaction lifecycle, user admin actions). A single `app/config/logging.py` module sets up Python's standard `logging` once at startup, driven by a `log_level` setting. Logs are minimal and descriptive — only events that matter for security and operations are recorded, and no sensitive data is ever logged.

## Functional Requirements
- Add a `app/config/logging.py` module that configures Python's standard `logging` with a single, consistent format and log level driven by settings.
- Expose a `log_level` setting in `app/config/settings.py` (default `INFO`).
- Call the logging setup once at application startup in `app/main.py`.
- All log messages must be descriptive and include only non-sensitive context (never passwords, tokens, or PII).

**Security events** (logged at `WARNING` level from exception handlers):
- Failed authentication (`CredentialError`)
- Forbidden access (`ForbiddenError`)
- Unauthenticated requests (`NotAuthenticatedError`)
- Unexpected server errors (`ERROR` level)

**Operational events** (logged at `INFO` level from services):
- Transaction created, updated, or deleted — include transaction ID and owner user ID.
- User created or deactivated by an admin — include target user ID.
- User self-update — include user ID and which fields were changed (not their values).

## Possible Edge Cases
- A misconfigured `log_level` value in `.env` should fall back to `INFO` rather than crashing startup.
- Logging setup must be idempotent — calling it more than once (e.g. during tests) must not duplicate handlers.

## Acceptance Criteria
- `app/config/logging.py` exists and is called during app startup.
- `log_level` is configurable via the `.env` file.
- A failed login attempt produces a `WARNING` log entry with no credential data.
- A forbidden access attempt produces a `WARNING` log entry.
- Transaction create/update/delete each produce an `INFO` log entry with transaction ID and user ID.
- Admin user create/deactivate produces an `INFO` log entry with target user ID.
- No log entry at any level contains a raw token, password, secret, or field value.
- Existing tests continue to pass without log noise.

## Open Questions
- Should logs go to stdout only (suitable for containerised/12-factor deployment) or also to a file? stdout only.
- Is structured/JSON logging (e.g. `python-json-logger`) needed now, or is plain text sufficient for this stage? plain text is enough.

## Testing Guidelines
Create tests in `./tests/` for the following cases, without going too heavy:
- Security-event exception handlers emit a `WARNING` log with the expected message and no sensitive data.
- Transaction service emits an `INFO` log on create, update, and delete.
- Logging setup is idempotent (calling it twice does not duplicate handlers).
