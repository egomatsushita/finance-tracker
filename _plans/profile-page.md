# Implementation Plan — Profile Page (FT-40)

## Context

The app's sidebar already links to `/profile` (`web/components/nav/navItems.ts`),
but the page doesn't exist. FT-40 delivers it: a signed-in user views their own
account and edits the fields the backend allows via `UserUpdateSelfSchema`
(`username`, `email`, `password`). The backend is complete — `GET /users/me`,
`GET /users/{id}`, and `PUT /users/{id}` (ownership + CSRF enforced server-side;
CSRF already attached automatically by `web/lib/api.ts`). No backend changes.

Spec: `_specs/profile-page.md`. Resolved decisions: **view-with-edit-toggle**;
password is an **optional** field (blank = unchanged); **no** current-password
re-auth; refresh auth state via a new **`refreshUser()`**; show only **"member
since"**; show a **toast** on successful save.

Key constraint: the project keeps dependencies minimal (CLAUDE.md) and hand-rolls
UI primitives (`Select`, `Modal` are custom). No toast library exists, so we
build a small in-house toast rather than add `sonner`.

## Changes

### 1. Auth context — expose `refreshUser` (`web/lib/auth.tsx`)
`AuthProvider` sets `user` internally with no external updater, so a changed
username/email would leave the nav stale. Add `refreshUser: () => Promise<void>`
to `AuthContextValue` that re-runs the existing `hydrate()` helper and
`setUser(...)`, and include it in the provider value. Keeps the server as the
source of truth.
- Update `web/lib/auth.test.tsx` for the new context field.

### 2. In-house toast (`web/components/ui/Toast.tsx` — new)
Export `ToastProvider` + `useToast()` (returns `showToast(message, variant?)`).
Provider holds a short-lived toast in state, auto-dismisses (~4s) via
`setTimeout`, and renders a fixed-position, dismissible region with
`role="status"` / `aria-live="polite"`. Style with existing Tailwind tokens
(`bg-surface`, `border-muted-border`, `text-ink`, `shadow-md`) to match `Card`.
- Wire `ToastProvider` into `web/app/providers.tsx`, wrapping `children` (inside
  `AuthProvider` is fine) so pages can call `useToast()`.

### 3. Data layer (`web/lib/queries.ts`, `web/lib/types.ts`)
- Add `ProfileUpdatePayload = { username?: string; email?: string; password?: string }`
  to `web/lib/types.ts`.
- Add `useUpdateProfile()` to `web/lib/queries.ts` following the existing
  `useUpdateTransaction` pattern: `useMutation` wrapping
  `api.put<User>(\`/users/${id}\`, payload)`. The component triggers
  `refreshUser()` on success, so no cache invalidation is required here.

### 4. Profile page (`web/app/(app)/profile/page.tsx` — new)
Client component. Pulls `user` + `refreshUser` from `useAuth()`, `showToast` from
`useToast()`, and `useUpdateProfile()`. Local `isEditing` boolean. The app-group
layout (`web/app/(app)/layout.tsx`) already gates on auth and only renders
children once `user` is non-null, so the page can rely on `user` being present
(still guard defensively).

- **View mode (default):** a `Card` showing username, email, account status, and
  "Member since {formatDate(user.created_at)}" — reuse `formatDate` from
  `web/lib/format.ts`. An **Edit** `Button` enters edit mode.
- **Edit mode:** react-hook-form + `zodResolver` + `Input`/`Button`/`Card`,
  mirroring `web/app/signup/page.tsx`. Fields: `username`, `email`, `password`
  (new, optional, `autoComplete="new-password"`), `confirmPassword`. Pre-fill
  username/email from `user`; password fields start empty.
  - zod schema: username non-empty, email valid; when `password` is non-empty
    require min length 8 and `password === confirmPassword` (via `.refine`).
  - **Save** builds a partial payload by diffing against current `user`: omit
    `username`/`email` when unchanged, omit `password` entirely when blank. If
    the payload is empty, skip the request and just exit edit mode. Otherwise
    call the mutation; on success `await refreshUser()`, `showToast('Profile
    updated')`, and return to view mode.
  - **Cancel** (`secondary` Button) resets the form and returns to view mode.
  - Errors: `ApiError` 409 → "Username or email already taken" (same wording as
    signup); other failures → "Something went wrong". Save button uses
    `isLoading` while pending.

### 5. Tests (Vitest + RTL — frontend TDD convention)
- `web/app/(app)/profile/page.test.tsx`: view render shows user fields +
  member-since; Edit reveals pre-filled form; Cancel restores view; Save sends a
  diff-only `PUT` and omits blank password; password/confirm mismatch blocks
  submit; 409 shows "already taken" and stays in edit mode; success triggers
  `refreshUser` + toast and returns to view mode.
- `web/lib/auth.test.tsx`: `refreshUser` re-hydrates and updates context user.
- `web/components/ui/Toast.test.tsx`: `showToast` renders a message that can be
  dismissed / auto-expires.

## Files
- `web/lib/auth.tsx` (+ test) — add `refreshUser`
- `web/components/ui/Toast.tsx` (new, + test) — minimal toast
- `web/app/providers.tsx` — mount `ToastProvider`
- `web/lib/queries.ts` — add `useUpdateProfile`
- `web/lib/types.ts` — add `ProfileUpdatePayload`
- `web/app/(app)/profile/page.tsx` (new, + test) — the page

## Verification
- `cd web && npm run test` (or the project's Vitest command) — all new/updated
  tests pass.
- `cd web && npm run lint` — clean (single quotes in JS/TS, double in JSX).
- Manual: run backend (`uv run app/main.py`) + frontend dev server, log in, open
  **Profile** from the sidebar. Confirm: view shows current details; Edit →
  change username/email → Save shows a toast, returns to view with new values,
  and the sidebar/shell reflects the new username; changing the password then
  logging out/in works; a duplicate username/email shows the "already taken"
  error; leaving password blank keeps the current password.
