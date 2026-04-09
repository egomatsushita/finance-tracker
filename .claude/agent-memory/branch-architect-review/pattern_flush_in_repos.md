---
name: Repository flush/refresh pattern
description: Established pattern for flush() and refresh() usage in UserRepository after write operations
type: project
---

`create()` calls `flush()` only (no `refresh()`). `update()` now calls both `flush()` then `refresh()` — the refresh ensures the returned object reflects any DB-side changes (e.g. updated_at triggers) after an in-place mutation via setattr. This asymmetry is intentional: `create()` returns the newly added object whose state is already tracked, while `update()` mutates an existing tracked object that may have server-side defaults re-evaluated.

**Why:** Added in FT-19 to fix IntegrityError surfacing at commit time rather than within the service's try/except block.

**How to apply:** Any future repository write methods that mutate existing rows should follow the flush()+refresh() pattern. Methods that insert new rows only need flush().
