# Spec for API Client and Auth Foundation

branch: FT-35_api-client-auth-foundation

## Summary
Build the frontend's data-fetching and auth plumbing in `web/lib/`: a typed fetch wrapper, TypeScript types mirroring the backend schemas, an `AuthProvider`/`useAuth` hook that manages the bearer token and current-user hydration, and a React Query provider. This is pure wiring — no login form, no protected routes, no visible UI beyond what's needed to prove the pieces work. It unblocks every subsequent frontend ticket (login page, authed shell, and all data-driven pages), which all depend on this foundation per `_plans/dashboard.md`.

## Functional Requirements
- `web/lib/types.ts` — TypeScript types mirroring the API's read/create/update shapes for `User` (`id, username, email, is_active, role, created_at, updated_at`) and `Transaction` (`id, amount, kind, category, description, transaction_date, user_id, created_at, updated_at`), plus the `kind`/`category` enums from `_plans/dashboard.md`. Types only — no runtime validation (zod enters in later tickets with forms).
- `web/lib/api.ts` — a typed fetch wrapper that:
  - Reads `NEXT_PUBLIC_API_URL` as the base URL.
  - Attaches `Authorization: Bearer <token>` to every request once a token exists.
  - Exposes a small set of HTTP helpers (e.g. `get`, `post`, `put`, `patch`, `del`) that return parsed JSON and throw a typed error on non-2xx responses.
  - On a `401` response, clears the stored token and triggers logout (redirect to `/login`) — the single place this logic lives, so every later page/query gets 401 handling for free.
  - Login itself (`POST /auth/token`) is form-encoded (`application/x-www-form-urlencoded`), not JSON — the wrapper needs to support (or have a sibling helper for) that content type.
- `web/lib/auth.tsx` — `AuthProvider` + `useAuth()`:
  - Persists the bearer token in `localStorage`.
  - On mount, if a token exists, calls `GET /users/me` to hydrate `{ id, username, email, role, ... }` into context.
  - Exposes `login(username, password)`, `logout()`, `user`, and a loading/hydrating flag so consumers can distinguish "not yet known" from "known logged out."
  - `login` posts to `/auth/token`, stores the returned token, then hydrates the user the same way as mount.
- React Query provider: a `QueryClientProvider` (with a module-level `QueryClient`) wrapping the app, composed with `AuthProvider` in `app/layout.tsx` (or a small `Providers` component) so both are available to all routes without this ticket touching page content.
- No new pages, no route guarding, no sidebar/shell — those are FT-36/FT-37. This ticket only needs to prove the wiring compiles, builds, and the auth hydration call actually round-trips against the real backend.

## Possible Edge Cases
- No token in `localStorage` on first load: `useAuth` should resolve to "logged out" without attempting the `GET /users/me` call.
- Stale/invalid token in `localStorage` (e.g. expired JWT, ~30 min lifetime, no refresh token): the hydration call returns `401`, which must clear the token and leave the user logged out, not throw an unhandled error or loop.
- `localStorage` access during SSR/server rendering: token reads must be guarded so this doesn't throw when `AuthProvider` is evaluated outside the browser (Next.js App Router renders a server pass first).
- Race between the hydration fetch and a page that immediately redirects based on `user` — the loading flag must be `true` until hydration settles so FT-37's guard doesn't bounce a legitimately logged-in user to `/login` before the fetch resolves.
- `POST /auth/token` with bad credentials returns a non-401 4xx (per backend conventions) — the wrapper's generic error handling must surface this distinctly from a 401-triggered logout, since this is a login attempt, not a session expiry.
- Concurrent requests that all get a `401` around the same time (e.g. several queries in flight when the token expires) should not redirect/clear state multiple times in a way that causes a flicker or duplicate navigation.

## Acceptance Criteria
- `web/lib/types.ts`, `web/lib/api.ts`, `web/lib/auth.tsx` exist and `npm run build`/`npm run lint` pass with no errors.
- With the backend running and a valid seeded user (`admin`/`admin` or `member`/`member` per the root README), manually calling `useAuth().login(...)` from a temporary debug point (or a minimal scratch page removed before commit) successfully stores a token and hydrates `user` with the correct id/role from `GET /users/me`.
- An expired/garbage token placed in `localStorage` before load results in `useAuth()` settling to `user: null`, not an unhandled rejection, and the bad token is cleared.
- No `localStorage` access throws during the Next.js server render pass (verified via `npm run build` + `npm run dev` with no console errors on first load).
- `app/layout.tsx` composes `AuthProvider` and the React Query provider without altering the existing placeholder `/` or `/design` pages' output.

## Open Questions
- Should the React Query `QueryClient` use any non-default options now (e.g. `retry: false` on 401s, `staleTime`), or leave fully default until a real query is written in FT-38? Recommend leaving default — tuning without real usage patterns is premature. (Follow the recommended)
- Should `lib/api.ts`'s error type carry the parsed error envelope body (for later 409/403 message surfacing in FT-39/FT-41), or just status code for now? Recommend carrying the parsed body now since the shape is already known from the backend's `exception_handlers.py`, saving a rework later. (Follow the recommended)

## Testing Guidelines
No backend tests apply. Per `_plans/dashboard.md`, no frontend test harness (Jest/Playwright) is introduced yet, so verification stays manual:
- Manually verify `npm run build` and `npm run lint` are clean.
- Manually verify, against the running backend, that: (1) logging in via a temporary debug call stores a token and hydrates the user; (2) a pre-seeded bad token in `localStorage` is cleared and leaves the user logged out without errors; (3) no console errors appear on first load (SSR-safe `localStorage` access).
- Do not add Jest/Playwright/Vitest in this ticket.
