---
name: project-web-frontend-patterns
description: Next.js App Router frontend (web/) auth + API client foundation added in FT-35 — patterns and known tradeoffs to check in future frontend reviews
metadata:
  type: project
---

Repo is a monorepo: FastAPI backend (`app/`) plus a Next.js 16 App Router + TypeScript frontend (`web/`), using `@tanstack/react-query` for data fetching and a hand-rolled `fetch` wrapper (`web/lib/api.ts`) for the API client — no axios/swr.

**Auth/token storage:** JWT access token stored in `localStorage` (`web/lib/api.ts`, key `ft_token`), not an httpOnly cookie. This is an explicit XSS-exposure tradeoff for a client-only SPA-style auth foundation — flag as a reminder in reviews but it was an accepted architectural choice for FT-35, not an oversight to re-litigate every time unless new context suggests otherwise.

**401 handling pattern:** `web/lib/api.ts` uses a module-level `unauthorizedHandled` boolean to dedupe concurrent 401s into a single hard redirect (`window.location.assign('/login')`), reset via `resetUnauthorizedGuard()` on fresh login. Requests can opt out via a `skipAuthRedirect` flag (used by `AuthProvider`'s mount-time hydration in `web/lib/auth.tsx`) so a stale/invalid token on first load settles to logged-out quietly instead of redirecting.

**Fixed in FT-35 (don't re-flag):** `hydrate()` in `web/lib/auth.tsx` used to treat *any* thrown error from `/users/me` as "invalid session" and clear the token. This was fixed within the same ticket — it now only clears the token on a confirmed `ApiError` with `status === 401`; other failures (network/5xx) leave the token intact and just resolve to `user: null` for that load.

**ESLint convention:** project switched to `semi: ['error', 'never']` (no semicolons) in `web/eslint.config.mjs` as of FT-35 — new files should follow no-semicolon style; pre-existing semicolon style in pages predates this and gets reformatted file-by-file as touched.

See also [[project_rbac_patterns]] for backend-side role model that this frontend will eventually need to respect in UI gating (no role-based UI logic yet as of FT-35 — `User.role` is fetched but unused beyond display).
