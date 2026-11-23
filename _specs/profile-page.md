# Spec for Profile Page

branch: FT-40_profile-page

## Summary

Add a Profile page at `/profile` (inside the authenticated app shell) where a
signed-in user can view their own account details and edit the fields allowed by
the backend's `UserUpdateSelfSchema` (`username`, `email`, `password`). The
`/profile` nav link already exists in `components/nav/navItems.ts`; this ticket
delivers the page it points to.

The page reads the current user and persists changes through the existing
backend endpoints:

- `GET /users/me` — current user (already used by `AuthProvider` hydration).
- `PUT /users/{user_id}` — update own profile (ownership + CSRF enforced
  server-side; CSRF header is already attached automatically by `lib/api.ts`).

The page uses a **view-with-edit-toggle** model: a read-only summary by default,
with an Edit action that reveals the form (Save / Cancel). Password change is an
**optional** field in the same form — leaving it blank keeps the current
password. No current-password re-entry is required (the backend does not require
it).

## Functional Requirements

- A new route at `web/app/(app)/profile/page.tsx` renders within the authed
  `AppShell` (unauthenticated users are already redirected to `/login` by the
  app-group layout).
- **View mode (default):**
  - Display `username`, `email`, account status (`is_active`), and a
    human-readable "member since" derived from `created_at` (and optionally
    "last updated" from `updated_at`).
  - Seed values from the existing `useAuth().user` context rather than issuing a
    duplicate fetch; fall back gracefully if the user is still loading.
  - An **Edit** button switches the page into edit mode.
- **Edit mode:**
  - A form (react-hook-form + zod + `Input`/`Button`/`Card`, matching the
    signup/login convention) with fields: `username`, `email`, `password` (new,
    optional) and `confirmPassword` (frontend-only confirmation).
  - Fields are pre-filled with the current `username`/`email`; password fields
    start empty.
  - **Save** submits only changed fields via `PUT /users/{user_id}` using a
    `model_dump(exclude_unset=...)`-style partial payload — i.e. omit `password`
    entirely when the new-password field is blank, and omit `username`/`email`
    when unchanged.
  - **Cancel** discards edits and returns to view mode with original values.
- **Auth state sync:** after a successful update that changes `username` or
  `email`, the value shown in the nav/shell and elsewhere must reflect the new
  data. Since `AuthProvider` currently exposes no setter, expose a way to
  refresh the context user (e.g. a `refreshUser()` that re-hydrates from
  `/users/me`, or a `setUser` returned from the context) and call it on success.
- **Data layer:** add a profile update hook in the React Query style of
  `lib/queries.ts` (e.g. `useUpdateProfile`) wrapping `api.put<User>(…)`, and
  invalidate/refresh any cached user data on success.
- **Validation (client, zod):**
  - `username` required (non-empty) when in the payload.
  - `email` required and valid email format when in the payload.
  - `password`, when provided, meets the same minimum the backend expects
    (min length 8, consistent with signup) and must match `confirmPassword`.
- **Error handling:**
  - `409 Conflict` → "Username or email already taken" (same wording as signup).
  - Other failures → generic "Something went wrong" form-level message.
  - Submit button shows a loading state while the request is in flight.

## Possible Edge Cases

- User opens Edit, changes nothing, and saves → no fields sent (or request
  skipped); page returns to view mode without error.
- New password entered but `confirmPassword` differs → blocked by client
  validation, no request sent.
- Password left blank but username/email changed → `password` omitted from
  payload entirely (not sent as empty string).
- Email changed to one already used by another account → surfaced as the 409
  message, form stays in edit mode with values intact.
- Session expires mid-edit (401) → existing `handleUnauthorized()` redirect to
  `/login` applies; no special handling needed.
- `useAuth().user` still `null`/loading on first paint → show the existing
  skeleton / loading affordance rather than an empty form.
- `is_active` must never be sent in the payload (schema is `extra="forbid"`;
  sending it would 422).

## Acceptance Criteria

- Navigating to `/profile` while authenticated shows the current user's
  username, email, status, and member-since, with an Edit action.
- Clicking Edit reveals a pre-filled form; Cancel restores view mode unchanged.
- Saving a changed username and/or email issues a single `PUT /users/{id}` with
  only the changed fields and, on success, returns to view mode showing the new
  values — including in the nav/shell.
- Entering a new password (matching confirmation) updates the password; leaving
  it blank leaves the password unchanged and omits it from the request.
- A duplicate username/email surfaces the "already taken" message and keeps the
  user in edit mode.
- Unauthenticated access to `/profile` redirects to `/login` (via existing
  layout behavior).

## Open Questions

- Preferred mechanism to refresh auth context after update: expose `setUser`
  vs. a `refreshUser()` re-hydration helper on `AuthProvider`? (Leaning toward
  `refreshUser()` so the server stays the source of truth.) Prefer `refreshUser`.
- Should "last updated" (`updated_at`) be shown, or only "member since"? Only "member since"
- Should a success confirmation (toast/inline message) be shown after saving, or
  is the return-to-view-mode with updated values sufficient? Show a toast message.

## Testing Guidelines

Create test file(s) under `web/app/(app)/profile/` (Vitest + React Testing
Library, matching the existing frontend TDD setup). Cover, without going too
heavy:

- View mode renders the current user's username, email, and member-since from
  auth context.
- Clicking Edit shows a pre-filled form; Cancel returns to view mode with
  original values.
- Saving changed username/email calls `PUT /users/{id}` with only the changed
  fields and omits `password` when blank.
- New password + mismatched confirmation blocks submission (client validation).
- A 409 response renders the "already taken" message and keeps edit mode.
- After a successful save, the displayed values (and auth context) reflect the
  update.
