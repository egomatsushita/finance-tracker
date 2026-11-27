# Spec for Signup Page Polish & Guest-Only Auth Guard

branch: FT-41_signup-page-polish

## Summary

FT-41. The `/signup` page already exists and is wired end-to-end (react-hook-form +
zod, `useAuth().signup` → `POST /auth/signup`, inline 409 handling, link to `/login`).
This ticket closes the gaps discovered during grilling and adds a guest-only route
guard to both auth pages.

Three changes:
1. Enforce the backend's password minimum length (8) in the frontend zod schema so the
   error shows inline instead of via a server round-trip.
2. Add a client-only confirm-password field validated against `password`.
3. Add a shared guest-only guard (mirror of `(app)/layout.tsx`) that redirects
   already-authenticated users away from `/login` and `/signup` to the dashboard (`/`).

Out of scope: the success redirect (signup auto-logs-in via the backend session cookie
and already lands on `/` = the dashboard; no change) and the 409 message granularity
(backend does not distinguish username vs. email, so the single form-level message
stays).

## Functional Requirements

- **Password min length**: `signupSchema.password` requires at least 8 characters,
  mirroring the backend's `Field(min_length=8)`. The existing non-empty check is
  subsumed by this.
- **Confirm-password field**: a new `confirmPassword` field is added to the signup form
  and schema. It is validated client-side only (zod `.refine` / `.superRefine`) to match
  `password`; on mismatch the error attaches to the `confirmPassword` field. It is never
  sent to the backend — `signup()` is still called with `(username, email, password)`.
  Uses `type="password"` and `autoComplete="new-password"`.
- **Guest-only guard**: a shared guard (new file under `web/components/` or `web/lib/`,
  mirroring the `(app)/layout.tsx` pattern) reads `{ user, loading }` from `useAuth()`,
  and in a `useEffect` calls `router.replace('/')` when `!loading && user !== null`.
  While `loading || user !== null` it renders nothing (or a minimal placeholder) so the
  form never flashes for an authenticated user. Applied to both `/login` and `/signup`.
- **No backend changes**: `POST /auth/signup` and `UserSignupSchema` are unchanged.

## Possible Edge Cases

- Authenticated user manually navigates to `/signup` or `/login` (or hits a stale
  bookmark) → redirected to `/`, form never rendered.
- Auth state still hydrating (`loading === true`) on `/login` or `/signup` → render the
  placeholder, do not redirect yet, do not flash the form.
- Password valid (≥8) but `confirmPassword` differs → field-level mismatch error, no
  submit, no network call.
- Password < 8 characters → inline min-length error, no network call.
- 409 from a genuinely taken username/email after valid client input → existing single
  form-level "Username or email already taken" message (unchanged).

## Acceptance Criteria

- Submitting a password shorter than 8 characters shows an inline validation error and
  makes no request to `POST /auth/signup`.
- Submitting with mismatched password / confirm-password shows an inline error on the
  confirm field and makes no request.
- `signup()` is still invoked with exactly `(username, email, password)` —
  `confirmPassword` is not forwarded.
- A logged-in user visiting `/login` or `/signup` is redirected to `/` and the form is
  not shown.
- A logged-out user visiting `/login` or `/signup` sees the form as before.
- Existing signup behaviour is preserved: successful signup auto-logs-in and redirects to
  `/`; a 409 shows the single form-level message and does not navigate.

## Open Questions

- None. All decisions were settled during grilling (redirect target, password rule, 409
  granularity, confirm-password, guard scope = both pages).

## Testing Guidelines

Follow the existing Vitest + RTL style (`web/app/signup/page.test.tsx`,
`web/app/login/page.test.tsx`). Note: adding the guard means every existing `useAuth`
mock in both test files must now also return `user: null, loading: false`, or the guard
will suppress the form. Add meaningful tests for:

- Password shorter than 8 chars → inline error, `signup` not called.
- Mismatched confirm-password → inline error on the confirm field, `signup` not called.
- Successful signup → `signup` called with `(username, email, password)` only (no
  confirm value) and `push('/')`.
- `/signup` with an authenticated user (`user` non-null, `loading` false) → `replace('/')`
  called, form not rendered.
- `/login` with an authenticated user → `replace('/')` called, form not rendered.
- Guest-only guard: while `loading` is true, neither the form renders nor a redirect
  fires.
