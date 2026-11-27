# Plan: FT-35 — API Client & Auth Foundation

## Context
FT-34 (merged) scaffolded the Next.js frontend (`web/`) with no data-fetching or auth capability yet. Every subsequent frontend ticket — login page (FT-36), authed shell (FT-37), and every data-driven page (FT-38–41) — depends on a typed API client and an auth context existing first. This ticket builds that foundation only: `web/lib/types.ts`, `web/lib/api.ts`, `web/lib/auth.tsx`, and a React Query provider wired into `app/layout.tsx`. No login UI, no route guarding, no visible page changes. Spec: `_specs/api-client-auth-foundation.md`.

Backend facts verified directly from source (not assumed):
- `POST /auth/token` — form-encoded (`username`, `password`), not JSON. Response `{ access_token: string, token_type: "bearer" }`. Bad credentials → 401 `{ detail: "Incorrect username or password" }`.
- `GET /users/me` (declared before `/{user_id}`, already correctly ordered) → `{ username, email, is_active, role: "admin"|"member", id, created_at, updated_at }`.
- Transaction read shape (for `types.ts` even though unused until FT-38/39): `{ id: number, user_id, amount: string, kind: "income"|"expense", category: string, description: string|null, transaction_date, created_at, updated_at }`. Plus `TransactionSummarySchema`.
- Error envelope is always `{ detail: string }` for domain exceptions (401/403/404/409), but `{ detail: ValidationErrorDetail[] }` for 422s — needs a union type.
- JWT: HS256, 30 min, **no refresh token endpoint exists** — any 401 means "session over."
- CORS already allows `http://localhost:3000`.

## Approach
Flat `lib/` structure (confirmed with user — matches this project's layer-based convention already used on the backend, appropriate at this app's current size).

### `web/lib/types.ts`
Plain types mirroring the schemas above: `User`, `UserRole`, `TransactionKind`, `IncomeCategory`/`ExpenseCategory`/`TransactionCategory`, `Transaction`, `TransactionSummary`, `ValidationErrorDetail`, `ApiErrorBody` (`detail: string | ValidationErrorDetail[]`), `LoginResponse`. No runtime validation (zod comes later with forms).

### `web/lib/api.ts`
- `ApiError` class carrying `status` + parsed `ApiErrorBody` (per spec's resolved open question — carry the body, not just status, so FT-39/41 can surface 409/403 messages later).
- `getToken`/`setToken`/`clearToken` — all guard on `typeof window === 'undefined'` so nothing throws during SSR.
- Centralized 401 handling: a module-level `unauthorizedHandled` flag + `handleUnauthorized()` (clear token, `window.location.assign('/login')`) that only fires once until `resetUnauthorizedGuard()` is called. This dedupes concurrent 401s (the spec's race-condition edge case) without needing React state, since `api.ts` is a plain module used outside React too.
- Generic `request<T>()` takes a `skipAuthRedirect` flag — the mount-time hydration call passes `true` so a stale/garbage token on first load clears quietly (`user: null`) instead of firing a pointless redirect; all future authed queries (FT-38+) use the default `false` path.
- `api.get/post/put/patch/del` — JSON helpers built on `request()`.
- `loginRequest(username, password)` — **separate** helper, form-encoded body, own fetch call. Critically, a 401 here is "bad credentials" (a login attempt), not session expiry, so it must never go through `handleUnauthorized()`/redirect — it just throws `ApiError` for the caller (future login page) to display inline.

### `web/lib/auth.tsx`
`'use client'`. `AuthProvider` + `useAuth()`:
- State: `user: User | null`, `loading: boolean` (starts `true`, flips `false` only after mount-hydration settles — this is what lets FT-37's future guard tell "unknown yet" apart from "known logged out").
- On mount: if a token exists, call `GET /users/me` with `skipAuthRedirect: true`; on any failure, clear token and settle `user: null` (no throw, no loop).
- `login(username, password)`: calls `loginRequest`, stores token, calls `resetUnauthorizedGuard()` (new session ⇒ future 401s should redirect again), re-hydrates user, throws on failure so a future login form can catch and display `err.body.detail`.
- `logout()`: clears token, sets `user: null`.
- `useAuth()` throws if used outside `AuthProvider` (standard context guard).

### `web/app/providers.tsx` (new)
Small `'use client'` component: `QueryClientProvider` wrapping `AuthProvider`. Use `useState(() => new QueryClient())` for the client instance — this is the standard Next.js App Router + React Query pattern (avoids any cross-request sharing surprises later if SSR data-fetching is added), while still being a single stable client for the app's lifetime, consistent in spirit with the spec's "module-level QueryClient." Default `QueryClient` options (no tuning — per spec's resolved open question, premature before real queries exist in FT-38).

### `web/app/layout.tsx` (edit)
Import `Providers`, wrap `{children}` with it inside `<body>`. No other change — fonts, `colorSchemeScript`, metadata untouched, so `/` and `/design` render identically (Providers adds no DOM).

### `web/package.json`
Add `@tanstack/react-query` as a real dependency (`npm install @tanstack/react-query` from `web/`).

## Verification
1. `npm run lint` and `npm run build` clean (automated half of acceptance criteria).
2. Temporarily add `web/app/scratch/page.tsx` (client component) using `useAuth()` to render `{ loading, user }` as JSON with two buttons: "Login (admin/admin)" and "Set bad token" (writes `localStorage.setItem('ft_token', 'garbage')` then reloads). Use this to manually confirm, against the running backend (`uv run app/main.py`):
   - Fresh load, no token → `loading:false, user:null`, no console errors.
   - Click login → `user` populates with real `id`/`role` from `/users/me`.
   - Garbage token + reload → settles to `user:null`, token removed from `localStorage`, no unhandled rejection/console error.
   - `npm run build && npm run start`, confirm no console errors on `/` and `/design`.
3. **Delete `web/app/scratch/` before committing** — it's a disposable verification aid, not part of the shipped feature.

## Commit breakdown (code side; spec/plan docs committed separately per FT-34's pattern)
1. `[FT-35] chore: add @tanstack/react-query dependency`
2. `[FT-35] feat: add API types mirroring backend schemas` — `web/lib/types.ts`
3. `[FT-35] feat: add typed fetch wrapper with 401 handling` — `web/lib/api.ts`
4. `[FT-35] feat: add AuthProvider and useAuth hook` — `web/lib/auth.tsx`
5. `[FT-35] feat: compose React Query and auth providers in layout` — `web/app/providers.tsx`, `web/app/layout.tsx`

## Critical files
- `web/lib/types.ts` (new)
- `web/lib/api.ts` (new)
- `web/lib/auth.tsx` (new)
- `web/app/providers.tsx` (new)
- `web/app/layout.tsx` (edit)
- `web/package.json` (dependency add)
