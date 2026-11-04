---
name: project-web-frontend-patterns
description: Next.js App Router frontend (web/) — auth/API client foundation (FT-35, superseded by FT-43's cookie migration) and UI primitives/first page (FT-36) — patterns and known tradeoffs to check in future frontend reviews
metadata:
  type: project
---

Repo is a monorepo: FastAPI backend (`app/`) plus a Next.js 16 App Router + TypeScript frontend (`web/`), using `@tanstack/react-query` for data fetching and a hand-rolled `fetch` wrapper (`web/lib/api.ts`) for the API client — no axios/swr.

**Auth/token storage — UPDATED by FT-43, do not flag localStorage/bearer anymore:** FT-35 originally stored a JWT in `localStorage`; FT-43 migrated this to an httpOnly `session` cookie + readable `csrf_token` cookie (double-submit). `web/lib/api.ts` now sends `credentials: 'include'` on every request and attaches `X-CSRF-Token` (read from the `csrf_token` cookie) on mutating requests. See [[project_httponly_cookie_csrf]] for the full design. There is no client-readable token anywhere in `web/` as of FT-43 — this closes the XSS-token-theft tradeoff noted in the original FT-35 memory.

**401 handling pattern:** `web/lib/api.ts` uses a module-level `unauthorizedHandled` boolean to dedupe concurrent 401s into a single hard redirect (`window.location.assign('/login')`), reset via `resetUnauthorizedGuard()` on fresh login. Requests can opt out via a `skipAuthRedirect` flag (used by `AuthProvider`'s mount-time hydration in `web/lib/auth.tsx`) so a stale/invalid session on first load settles to logged-out quietly instead of redirecting.

**Fixed in FT-35:** `hydrate()` in `web/lib/auth.tsx` used to treat *any* thrown error from `/users/me` as "invalid session". Now only a confirmed `ApiError` with `status === 401` clears state; other failures (network/5xx) resolve to `user: null` for that load without clearing anything persistent (moot now anyway since there's no client-side token to clear).

**Fixed in FT-36:** `AuthProvider.login()` used to resolve successfully even when post-login hydration (`GET /users/me`) returned `null`, silently leaving `user: null` with no error surfaced. Now throws `Error('Login succeeded but failed to load user profile')` when hydration comes back null, so callers (the login page) can react. Covered by a test in `web/lib/auth.test.tsx`.

**ESLint convention:** project uses `semi: ['error', 'never']` (no semicolons) in `web/eslint.config.mjs` as of FT-35 — new files should follow no-semicolon style.

**FT-36 — first page + `ui/` primitives:** `web/app/login/page.tsx` (react-hook-form + zod) and `web/components/ui/{Button,Input,Card}.tsx`. Notable patterns to check on future diffs that touch these:
- Login error branching: `err instanceof ApiError && err.status === 401` → "Incorrect username or password", else → generic "Something went wrong". This correctly catches both real 401s and the FT-36 `auth.tsx` plain-`Error` throw (non-`ApiError`, falls to generic branch) — reasonable, but note network/`TypeError` failures also land in the generic branch indistinguishably from "backend returned 500."
- `Input.tsx`/`Button.tsx` dropped `forwardRef` in favor of React 19's ref-as-prop (`ref` included directly in the props type) — this is the current convention for new components, not a regression.
- Accessibility gaps worth re-flagging if not addressed in a later ticket: no `aria-describedby` linking an input to its `error` paragraph, no `aria-invalid` on erroring inputs, no `role="alert"`/`aria-live` on the login page's `formError` paragraph or Input's error text — screen reader users aren't notified of validation/auth errors proactively. `Button` has no default `type="button"`, so a future consumer rendering it inside a `<form>` without an explicit `type` will accidentally get HTML's implicit `type="submit"`.

See also [[project_rbac_patterns]] for backend-side role model that this frontend will eventually need to respect in UI gating (no role-based UI logic yet — `User.role` is fetched but unused beyond display).
