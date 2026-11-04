# Spec for Login Page

branch: FT-36_login-page

## Summary
Build the first real page and the first `ui/` primitives: `web/app/login/page.tsx` plus `web/components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`. The page renders a centered login form (react-hook-form + zod), calls `useAuth().login()` (from FT-35), shows an inline error on bad credentials (401), and redirects to `/` on success. No route guarding of authed pages yet — that's FT-37.

## Functional Requirements
- `web/components/ui/Button.tsx` — variants `primary` (brand-colored) and `secondary`; `isLoading`/`disabled` states (disabled + spinner or opacity change while submitting); renders as `<button>`.
- `web/components/ui/Input.tsx` — labeled text input wrapping a `<label>` + `<input>`, forwards a ref (required for react-hook-form's `register`), supports an error message slot rendered beneath it in `text-expense`.
- `web/components/ui/Card.tsx` — simple surface container (`bg-surface`, `border-muted-border`, rounded, shadow) used as the login form's wrapper; generic enough for reuse on later pages.
- `web/app/login/page.tsx` (`'use client'`):
  - Centered single-column layout, product mark ("Finance Tracker") as the page's one gold/`highlight`-accented element per the design system.
  - Form fields: `username`, `password`, validated with `zod` (both required, non-empty) via `react-hook-form`'s `zodResolver`.
  - Submit calls `useAuth().login(username, password)`.
  - On success: redirect to `/` via `useRouter().push('/')`.
  - On failure: if the thrown error is an `ApiError` with `status === 401`, show "Incorrect username or password" inline below the form (not a toast — no toast system exists yet); any other error shows a generic "Something went wrong" inline message.
  - Submit button shows a loading state and is disabled while the request is in flight; fields stay enabled (nothing in the spec requires disabling them, and it avoids extra state).
  - Active-voice submit label: "Sign in".
- Add `react-hook-form`, `zod`, `@hookform/resolvers` as new `web/package.json` dependencies (`lucide-react` and `recharts` stay out of scope — not needed until later tickets).
- Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` as new dev dependencies — this is the first frontend ticket to introduce a test harness (per the updated `_plans/dashboard.md`). Write tests before the implementation (TDD): a failing test for each behavior below, then the minimal code to pass it.
- `web/lib/auth.tsx` fix (small, bundled with this ticket since the login page's error handling depends on it): in `login()`, if `hydrate()` resolves to `null` right after a successful `loginRequest()`, throw an error instead of resolving successfully. This lets the login page's existing error branch catch "logged in but couldn't load profile" the same way it catches bad credentials, instead of silently redirecting with `user: null`.

## Possible Edge Cases
- Already-authenticated user navigates to `/login` directly: out of scope for this ticket (no route guard exists until FT-37). Acceptable that they see the login form again; it will still work (re-login just issues a fresh session cookie, per FT-43's cookie-based auth).
- Double-submit (user presses Enter then clicks "Sign in" before the first request resolves): the loading/disabled state on the submit button must prevent a second concurrent `login()` call.
- Empty/whitespace-only username or password: caught by zod before any network call, inline per-field error from `Input`'s error slot, not the form-level 401 message.
- Backend unreachable (network error, not an HTTP error): `fetch` rejects before `loginRequest` can parse a response — this must still land in the form-level error branch ("Something went wrong"), not throw unhandled.
- Successful login but the subsequent `GET /users/me` hydration fails: as of FT-43, `hydrate()` in `web/lib/auth.tsx` swallows all errors internally and resolves to `null` — so `login()` currently **resolves successfully** even when hydration fails, silently leaving `user: null`. Left as-is, the login page would redirect to `/` with no user and no error shown. **This ticket fixes it**: `login()` will re-throw if hydration returns `null` right after a successful `loginRequest()`, so the login page's existing error branch (generic "Something went wrong" message, no navigation) correctly handles this case instead of silently proceeding. See the corresponding `web/lib/auth.tsx` change under Functional Requirements.

## Acceptance Criteria
- `web/components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`, and `web/app/login/page.tsx` exist; `npm run build`, `npm run lint`, and `npm run test` pass with no errors.
- Vitest test files exist for each new component and the login page, written before their implementation, covering the cases listed under Testing Guidelines below.
- With the backend running: submitting valid seeded credentials (`member`/`member`) navigates to `/` and `useAuth().user` is populated.
- Submitting wrong credentials shows "Incorrect username or password" inline, the form remains on `/login`, and no console error appears.
- Submitting an empty form shows zod validation errors on the empty field(s) without making a network request.
- If login succeeds but the post-login hydration fails (mocked), the login page shows "Something went wrong" and does not navigate — `login()` no longer resolves successfully in this case.
- Tab order and visible keyboard focus work through username → password → submit; the form is usable with a screen reader (labels associated via `Input`'s `<label for>`/`htmlFor`).

## Open Questions
- Should `Input` support a generic `type` prop now (for future email/number fields on later forms) or stay text/password-only until needed? Recommend adding a `type` prop now since it costs nothing and every later form (transactions, users, profile) needs it. (Follow the recommended)
- Should the redirect target after login be `/` unconditionally, or should it respect a `?from=` redirect param for a future "redirected to login mid-session" flow? Recommend `/` unconditionally — the `?from=` flow belongs to FT-37 (route guard) when it's actually needed, not speculative here. (Follow the recommended)

## Testing Guidelines
No backend tests apply. This is the first frontend ticket to introduce a test harness (Vitest + React Testing Library, per the updated `_plans/dashboard.md`) — follow TDD: write each test below as a failing test first, then implement against it.
- `Input`: renders label associated to the field (`getByLabelText`), renders an error message when passed one, forwards a ref/value correctly for controlled use with react-hook-form.
- `Button`: renders children/label, calls `onClick`/submits the form it's in, is disabled and shows a loading state when `isLoading`, does not fire a second click handler while disabled.
- `Card`: renders its children inside the surface container (minimal — just confirms composition, no visual assertion).
- Login page:
  - Renders username/password fields and a submit button.
  - Submitting with empty fields shows zod validation errors and does not call `login()`.
  - Submitting valid credentials calls `useAuth().login(username, password)` and, on success, navigates to `/` (mock `next/navigation`'s `useRouter`).
  - Submitting with a mocked `login()` that rejects with `ApiError(401, ...)` shows "Incorrect username or password" inline and does not navigate.
  - Submitting with a mocked `login()` that rejects with a non-`ApiError`/non-401 error shows the generic "Something went wrong" message.
  - Submit button is disabled while `login()`'s promise is pending (double-submit prevention); a second `login()` call is not made if submit is triggered again before the first resolves.
- `web/lib/auth.tsx`'s `login()`: unit test that when `loginRequest` resolves but the subsequent hydration call resolves to `null`, `login()` rejects (rather than resolving with `user` left `null`).
- Mock `useAuth` (from `web/lib/auth.tsx`) and `next/navigation`'s `useRouter` in the login page tests — do not hit the real backend in unit tests. For the `auth.tsx` unit test above, mock `./api`'s `loginRequest`/`getWithAuthHandling` (no real cookies/network).
- After the above pass, still manually verify against the running backend once: real login succeeds and hydrates the user, and a real 401 shows the inline message — this catches integration issues the mocked unit tests can't (e.g. actual `ApiError` shape from `api.ts`).
