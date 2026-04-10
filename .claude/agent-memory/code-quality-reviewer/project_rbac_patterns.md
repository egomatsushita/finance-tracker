---
name: RBAC implementation patterns and known gaps
description: Recurring patterns and known vulnerabilities in the user router's role-based access control layer
type: project
---

The router has been split (FT-21, merged 2026-04-10) into `admin_user_router` (`/admin/users`, router-level `RequireAdmin`) and `user_router` (`/users`, router-level `VerifyOwnership`). Watch for these patterns and known gaps:

1. **Role escalation via self-update (resolved FT-21)**: `UserUpdateSelfSchema` uses `extra="forbid"` and omits `role`/`is_active`, so Pydantic rejects those fields with 422 before they reach the service. The fix test is `test_member_cannot_self_escalate_role`. Consider this resolved.

2. **Service `update()` accepts `UserUpdateSelfSchema` but is called with `UserUpdateAdminSchema` from admin router (open)**: The service type annotation is `UserUpdateSelfSchema`, yet `admin_user_router` passes `UserUpdateAdminSchema` (which has `role` and `is_active`). Python duck-typing means this works at runtime because `model_dump(exclude_unset=True)` produces compatible keys, but the annotation is a lie — it will mislead static analysis and future readers. Flag on any diff that changes the service signature.

3. **Fail-open router boundary (mitigated)**: Both routers now use router-level auth deps (`RequireAdmin` and `VerifyOwnership` respectively), so any new route added to either router inherits the dep. The fail-open risk from per-route deps is gone, but verify router-level dep is not accidentally removed.

4. **`member_user` / `member_token` fixtures are session-scoped**: `test_member_cannot_self_escalate_role` now expects 422 (not 200), so the fixture mutation concern from the previous `test_member_can_update_own_role` test is resolved. Stale fixture state is no longer a risk for role mutation, but watch for other tests that mutate the shared `member_user`.

5. **`TestGetUser.test_can_read_any_user` hits `/users/` not `/admin/users/`**: Tests in `test_admin_users.py` that use the admin token but hit the member self-service route may pass for wrong reasons. Check for mismatched URL / router intent in admin test classes.

**Why:** Granular RBAC was introduced to support the admin/member role model. FT-21 moved to router-level deps and schema-level field restriction.
**How to apply:** On any diff touching either user router or the service `update()` signature, verify (a) schema field restrictions still cover role/is_active on the self-service path, (b) router-level deps are present, (c) service type annotations match all callers.
