---
name: RBAC implementation patterns and known gaps
description: Recurring patterns and known vulnerabilities in the user router's role-based access control layer
type: project
---

Per-endpoint RBAC was introduced in the user router via `RequireAdmin` and `VerifyOwnership` FastAPI dependencies (replacing a blanket router-level `verify_token`). Watch for these recurring issues in this area:

1. **Role escalation via self-update (open)**: The `VerifyOwnership` dependency allows a `member` to update their own profile, but does not strip or block changes to the `role` field. A member can self-promote to `admin` via PUT `/users/{id}`. Acknowledged in test (`test_member_can_update_own_role`) and in code comment as deferred to a future ticket. Flag if it remains unresolved in future reviews.

2. **Fail-open router boundary (open)**: Router-level auth was removed in favor of per-route deps. Any new route added without an explicit dependency is publicly accessible. On any diff adding routes to `user_router`, verify auth deps are present.

3. **Test token variable bug (resolved 2026-04-10)**: `test_admin_can_access_all_endpoints` previously used `member_token` instead of `admin_token`. Fixed in the RBAC test expansion — test now correctly uses `admin_token`.

4. **`member_user` / `member_token` fixtures are session-scoped**: Added in `tests/conftest.py`. The `member_user` fixture mutates DB state (inserts a row) at session scope. If `test_member_can_update_own_role` runs and successfully updates `role` to `admin`, the shared `member_user` object is stale — subsequent tests that rely on the member having `role="member"` may behave unexpectedly.

**Why:** Granular RBAC was introduced to support the admin/member role model. The migration from a blanket dep to per-route deps introduced these gaps.
**How to apply:** On any diff touching `user_router` or `VerifyOwnership`, check that role field updates are gated, all routes have explicit auth deps, and session-scoped fixtures are not mutated by individual tests.
