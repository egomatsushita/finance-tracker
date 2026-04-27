# Plan: Centralized Application Logging (FT-26)

## Context
The app has no logging at all — security events like failed auth and forbidden access produce no audit trail, and write operations leave no operational record. This plan adds minimal, descriptive logging via Python's stdlib `logging`: security events at `WARNING` from exception handlers, and write operations at `INFO` from services. Stdout only, plain text, no PII or secrets ever logged.

## Files to Create

### `app/config/logging.py`
Single public function `configure_logging(log_level: str) -> None`:
- Guard: `if logging.getLogger().handlers: return` — idempotency
- Fallback: `level = getattr(logging, log_level.strip().upper(), None); if not isinstance(level, int): level = logging.INFO`
- Handler: `StreamHandler(sys.stdout)` with formatter `"%(asctime)s %(levelname)s %(name)s %(message)s"`
- Set level on both root logger and handler

## Files to Modify

### `app/config/settings.py`
Add: `log_level: str = "INFO"`

### `app/main.py`
Add at module level (before `FastAPI()` instantiation):
```python
from config.logging import configure_logging
configure_logging(settings.log_level)
```

### `app/exception_handlers.py`
Add module-level: `logger = logging.getLogger(__name__)`

Add `logger.warning(...)` to three handlers only (method + path, no tokens):
- `credential_error_handler` → `"SECURITY credential_error method=%s path=%s", req.method, req.url.path`
- `not_authenticated_error_handler` → `"SECURITY not_authenticated method=%s path=%s", req.method, req.url.path`
- `forbidden_error_handler` → `"SECURITY forbidden method=%s path=%s", req.method, req.url.path`

### `app/services/transaction.py`
Add module-level: `logger = logging.getLogger(__name__)`

Log INFO after each successful write (after None guards, before return):
- `create`: after `repo.create()` → `"transaction_created transaction_id=%s user_id=%s", transaction.id, user_id`
- `update`: after None check → `"transaction_updated transaction_id=%s user_id=%s", transaction.id, user_id`
- `delete`: after the `if not` guard → `"transaction_deleted transaction_id=%s user_id=%s", transaction_id, user_id`

### `app/services/user.py`
Add module-level: `logger = logging.getLogger(__name__)`

Log INFO after each successful write:
- `create`: after `repo.create()` → `"user_created user_id=%s", new_user.id`
- `update`: after `UserNotFoundError` check, log field names only (exclude `password`, `hashed_password`) → `"user_updated user_id=%s fields=%s", user_id, sorted(user_data.model_fields_set - {"password", "hashed_password"})`
- `delete`: after `if not success` check → `"user_deleted user_id=%s", user_id`

## Tests to Create / Modify

### CREATE `tests/test_logging_setup.py`
- `clean_root_logger` fixture: saves/clears/restores root handlers around a test
- `test_adds_stdout_handler` — after configure, root has 1 StreamHandler to stdout
- `test_idempotent` — calling configure twice does not grow handler count
- `test_invalid_level_falls_back_to_info` — `configure_logging("BOGUS")` sets level `INFO`

### MODIFY `tests/services/test_transaction_service.py`
Add `class TestLogging` with 3 async tests using `caplog.at_level(logging.INFO, logger="services.transaction")`:
- `test_create_emits_info` — asserts `"transaction_created"`, result.id, user_id in caplog
- `test_update_emits_info` — asserts `"transaction_updated"`, transaction.id in caplog
- `test_delete_emits_info` — asserts `"transaction_deleted"`, transaction_id in caplog

### CREATE `tests/services/test_user_service.py`
Mirror transaction service test style. Needs function-scoped `session`, `service`, and `created_user` fixtures.
- `test_create_emits_info` — asserts `"user_created"`, result.id in caplog
- `test_update_logs_field_names_not_values` — asserts field name present, value NOT present in caplog
- `test_delete_emits_info` — asserts `"user_deleted"`, user_id in caplog

### CREATE `tests/routers/test_security_logging.py`
Uses existing `client`, `member_token` fixtures. `caplog.at_level(logging.WARNING, logger="exception_handlers")`:
- `test_credential_error_logs_warning` — bad login → 401, WARNING with `"SECURITY"` in caplog
- `test_forbidden_logs_warning` — member hits admin endpoint → 403, WARNING with `"forbidden"` in caplog
- `test_no_token_in_warning_message` — bad token → 401, token string NOT in any WARNING record

## Verification
Run `uv run pytest` — all existing tests must pass. New tests cover all three logging layers.
