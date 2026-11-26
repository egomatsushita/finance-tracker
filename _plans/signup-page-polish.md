# Implementation Plan — Signup Page Polish & Guest-Only Auth Guard (FT-41)

## Context

The `/signup` page already exists and is wired end-to-end (react-hook-form + zod,
`useAuth().signup` → `signupRequest` → `POST /auth/signup`, inline 409 handling,
link to `/login`). FT-41 closes three gaps found during grilling and adds a
guest-only guard to both auth pages. No backend changes — `POST /auth/signup`
(`UserSignupSchema`: `username`, `email`, `password` with `min_length=8`) and the
session-cookie auto-login are unchanged.

Spec: `_specs/signup-page-polish.md`. Resolved decisions: success redirect stays
`/` (already the dashboard; signup auto-logs-in) — **no change**; add frontend
password `.min(8)`; add a **client-only** confirm-password field; keep the single
form-level 409 message; add a guest-only guard to **both** `/login` and `/signup`.

**Design refinement over the spec (better than the spec's assumption):** the spec
anticipated a shared guard component wrapped inside each page, which would force
every existing `useAuth` mock in both page test files to add `user`/`loading`.
Instead, mirror the pattern the repo already uses for its authed area: an
`(app)/layout.tsx`-style route-group layout. Move `login/` and `signup/` into a new
`(auth)/` route group (route groups don't change the URL — `/login` and `/signup`
stay) and put the guard in `(auth)/layout.tsx`. The guard then runs in the layout,
not the page, so the existing page tests — which render the page component directly,
without the layout — need **no mock changes**. The guard is tested in isolation in
`(auth)/layout.test.tsx`, exactly like `(app)/layout.test.tsx` already does.

## Changes

### 1. `(auth)` route group + guest-only guard (`web/app/(auth)/layout.tsx` — new)

- `git mv web/app/login web/app/(auth)/login` and
  `git mv web/app/signup web/app/(auth)/signup`. Each dir holds only `page.tsx` +
  `page.test.tsx`; the tests import `./page` relatively, so the move is transparent.
  Page imports are `@/...` absolute and unaffected. URLs are unchanged.
- New `web/app/(auth)/layout.tsx`, the inverse of `(app)/layout.tsx`:
  `'use client'`; read `{ user, loading }` from `useAuth()`; in a `useEffect`,
  `router.replace('/')` when `!loading && user !== null`; while `loading || user !==
  null` render `null` (nothing to show for an authenticated user mid-redirect — no
  form flash, no skeleton needed since the destination is the dashboard); otherwise
  render `{children}`.

### 2. Signup page changes (`web/app/(auth)/signup/page.tsx`)

- `signupSchema.password`: replace `.min(1, 'Password is required')` with
  `.min(8, 'Password must be at least 8 characters')`, mirroring the backend's
  `Field(min_length=8)`.
- Add `confirmPassword: z.string().min(1, 'Please confirm your password')` and a
  schema-level `.refine((v) => v.password === v.confirmPassword, { message:
  'Passwords do not match', path: ['confirmPassword'] })` so the mismatch error
  attaches to the confirm field.
- Add a confirm-password `<Input>` after the password field: `label="Confirm
  password"`, `type="password"`, `autoComplete="new-password"`,
  `error={errors.confirmPassword?.message}`, `{...register('confirmPassword')}`.
- `onSubmit` still calls `signup(values.username, values.email, values.password)` —
  `confirmPassword` is never forwarded.

### 3. Tests

- **`web/app/(auth)/layout.test.tsx` (new)** — mirror `(app)/layout.test.tsx`:
  - `loading: true` → renders neither children nor a redirect (`replace` not called).
  - loaded with a `user` → `replace('/')` called, children not rendered.
  - loaded with `user: null` → children rendered, `replace` not called.
- **`web/app/(auth)/signup/page.test.tsx` (extend)** — add cases to the existing
  suite (which stays mocking `useAuth` as `() => ({ signup })`, unchanged):
  - password < 8 chars → inline min-length error, `signup` not called.
  - password ≥ 8 but `confirmPassword` differs → inline "Passwords do not match" on
    the confirm field, `signup` not called.
  - successful submit fills the confirm field too and asserts `signup` is called with
    exactly `(username, email, password)` — no confirm value leaks through.
  - Existing success/409/validation/double-submit cases: update them to also fill the
    new confirm field and a ≥8-char password so they still reach submit.
- **`web/app/(auth)/login/page.test.tsx`** — unchanged (guard is external to the page).

## Files

- `web/app/(auth)/layout.tsx` (new) — guest-only guard
- `web/app/(auth)/layout.test.tsx` (new) — guard tests
- `web/app/(auth)/login/` (moved from `web/app/login/`) — no code change
- `web/app/(auth)/signup/page.tsx` (moved + edited) — `.min(8)`, confirm field
- `web/app/(auth)/signup/page.test.tsx` (moved + extended)

## Commit breakdown

Matching the repo's one-concern-per-commit granularity:
1. `[FT-41] refactor: move login and signup into an (auth) route group` (pure `git mv`,
   no behaviour change — keeps the guard diff reviewable)
2. `[FT-41] feat: add guest-only guard redirecting authenticated users off auth pages`
   (`(auth)/layout.tsx` + `layout.test.tsx`)
3. `[FT-41] feat: enforce password min length and add confirm-password on signup`
   (signup `page.tsx` + `page.test.tsx`)

## Verification

- `cd web && npm run test` — all new/updated tests pass; existing login tests still
  green without modification.
- `cd web && npm run lint` and `npm run build` — clean (single quotes in JS/TS, double
  in JSX).
- Manual, backend (`uv run app/main.py`) + frontend (`npm run dev`) running:
  - Logged out, visit `/signup`: password < 8 → inline error, no `/auth/signup`
    request (Network tab); mismatched confirm → inline error; valid unique
    credentials → auto-login and land on `/` (dashboard).
  - Duplicate username/email → single "Username or email already taken" message, stays
    on `/signup`.
  - Logged in, manually visit `/signup` and `/login` → redirected to `/`, form never
    shown.
  - URLs remain `/login` and `/signup` (route group adds no path segment).
