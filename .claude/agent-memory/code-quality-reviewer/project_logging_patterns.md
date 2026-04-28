---
name: Logging implementation patterns and recurring issues
description: Patterns observed in logging setup and service-level log calls (introduced FT-26 area)
type: project
---

Observed in the logging infrastructure diff (2026-04-27) across `app/config/logging.py`, `app/exception_handlers.py`, `app/services/transaction.py`, `app/services/user.py`:

1. **`%`-style lazy formatting is the project standard for all log calls**: Every `logger.info()` and `logger.warning()` call uses `logger.info("msg %s", value)` to defer interpolation until the message is actually emitted. f-strings were used initially but reverted. Flag any f-string in a log call as a violation of this convention.

2. **`logger` assignment placed between import blocks in `exception_handlers.py`**: The module-level `logger = logging.getLogger(__name__)` was inserted between `import` statements rather than after all imports. This is an import-ordering violation that ruff/isort will flag and that can cause unexpected behavior in test environments where the module is imported before `configure_logging` runs.

3. **`configure_logging` idempotency guard is handler-presence check, not ownership check**: The guard `if logger.handlers: return` fires for any pre-existing handler, including those installed by `pytest`'s `caplog` fixture. This causes the function to silently no-op in some test environments. A module-level `_configured` flag is more reliable.

4. **Sensitive field filtering pattern in `user_updated` log**: `UserService.update` correctly strips `{"password", "hashed_password"}` from `model_fields_set` before logging field names. This is a good pattern — verify it is extended if new credential-adjacent fields are added to any update schema.

5. **`log_level` in `Settings` is unvalidated `str`**: Invalid values silently fall back to INFO inside `configure_logging`. A `Literal` type on the settings field would surface misconfiguration at startup rather than silently swallowing it.

**Why:** Logging was added uniformly across services and exception handlers in one diff. The lazy-formatting and import-ordering issues are the most likely to recur if the pattern is copy-pasted into future services.

**How to apply:** On any new service or handler that adds logging, check: (a) `%`-style args, not f-strings; (b) `logger` assignment is below all imports; (c) no sensitive field values (passwords, tokens, PII) appear in formatted log strings — field names are acceptable, values are not.
