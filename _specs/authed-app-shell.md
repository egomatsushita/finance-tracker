# Spec for Authed App Shell

branch: FT-37_authed-app-shell

## Summary
Introduce the `(app)` route group that wraps every authenticated page: `web/app/(app)/layout.tsx` guards against unauthenticated access (redirecting to `/login`), and renders a navigation shell (persistent sidebar on desktop, top bar + drawer on mobile) around the page content. The nav is the same for every signed-in user — no role gating (roles are being removed from the product; see Open Questions). The existing placeholder home (`web/app/page.tsx`) moves to `web/app/(app)/page.tsx` and stays a placeholder — building the real Overview page is FT-38. No new data fetching beyond what `useAuth()` already provides; this ticket is purely shell/navigation/guarding.

## Functional Requirements
- Move `web/app/page.tsx` to `web/app/(app)/page.tsx` (route and content unchanged — still the placeholder "Finance Tracker" / balance text).
- `web/app/(app)/layout.tsx` (`'use client'`):
  - Reads `{ user, loading } = useAuth()`.
  - While `loading`, renders the shell's skeleton pattern (see below) instead of children.
  - Once loaded, if `user` is `null`, redirects to `/login` via `useRouter().replace('/login')` and renders nothing (or the skeleton) while the redirect is in flight.
  - Once loaded with a `user`, renders the nav shell (sidebar/top-bar) with `children` as the main content area.
- Nav shell component(s) under `web/components/` (e.g. `components/nav/Sidebar.tsx`, `components/nav/TopBar.tsx`, or a single `components/nav/AppShell.tsx` — implementer's choice as long as desktop/mobile variants are covered):
  - Desktop (`md:` and up): persistent left sidebar with the product mark, nav links, and a user/logout affordance at the bottom.
  - Mobile (below `md:`): a top bar (product mark + hamburger trigger) and a slide-in drawer containing the same nav links, closing on link click or outside-tap/escape.
  - Nav links, same for every signed-in user: Overview (`/`), Transactions (`/transactions`), Profile (`/profile`). No admin-only link, no role check — `User`/`useAuth()` may still carry a `role` field today, but this ticket's nav does not branch on it.
  - Active link styling (current route highlighted) using `next/navigation`'s `usePathname()`.
  - Logout affordance calls `useAuth().logout()` then redirects to `/login`.
  - Icons via `lucide-react` (new dependency — add to `web/package.json`) for nav items, hamburger, and logout; never emoji.
- Skeleton/loading pattern: a single shared loading placeholder (e.g. `components/ui/Skeleton.tsx` if it doesn't already exist, or reuse an existing primitive) shown as one orchestrated shell-level skeleton during the `loading` auth state — not per-section scattered spinners.
- `/transactions`, `/profile` routes do not exist yet (they land in later tickets) — do not create placeholder pages for them in this ticket; only `(app)/page.tsx` needs to exist for the group to render. Nav links to not-yet-built routes are fine to render (they'll 404 until their ticket lands) — out of scope to stub them.
- No `/users` route and no admin integration of any kind in this ticket's nav shell — the planned removal of roles/admin from the product (see Open Questions) means this ticket doesn't build or wire anything admin-specific, rather than building it and hiding it.

## Possible Edge Cases
- Direct navigation to `/` while unauthenticated (no prior `/login` visit): `loading` starts `true`, hydration resolves `user: null`, guard redirects to `/login`. No flash of nav/content before the redirect — the skeleton covers this window.
- Logout while on an authed page: after `logout()` resolves, `user` becomes `null`; the same guard that handles direct unauthenticated access redirects to `/login`.
- Resize across the `md:` breakpoint while the mobile drawer is open: drawer should not remain stuck open once the layout switches to the desktop sidebar.
- Rapid auth state flicker (e.g. logout then immediate back-navigation): guard logic keys off the live `user`/`loading` values from context, so it stays consistent with whatever `AuthProvider` currently holds — no separate local auth cache to desync.

## Acceptance Criteria
- `web/app/(app)/layout.tsx`, nav shell component(s), and `web/app/(app)/page.tsx` exist; `npm run build`, `npm run lint`, and `npm run test` pass with no errors.
- Vitest test files exist for the layout guard and nav shell, written before their implementation, covering the cases under Testing Guidelines below.
- With the backend running and logged out: visiting `http://localhost:3000/` redirects to `/login`.
- After logging in: `/` renders the placeholder content inside the nav shell; sidebar (desktop) or top bar (mobile viewport) shows Overview, Transactions, Profile for every signed-in user.
- Clicking logout clears the session and returns to `/login`; a subsequent visit to `/` redirects to `/login` again.
- On a mobile viewport, the hamburger opens a drawer with the same nav links; selecting a link or tapping outside closes it.
- Keyboard: drawer trigger and nav links are reachable and operable via keyboard; drawer closes on Escape; visible focus states throughout.

## Open Questions
- Should the drawer trap focus while open (full a11y dialog pattern) or just be closeable via Escape/outside-tap? Recommend the lighter Escape/outside-tap/link-click close behavior for now — full focus-trapping is part of the broader a11y sweep in FT-42. (Follow the recommended)
- Single `AppShell` component vs. separate `Sidebar`/`TopBar`/`Drawer` components? Recommend separate small components (`Sidebar`, `TopBar`, `MobileDrawer`) composed by the layout — easier to unit test each responsibility in isolation, consistent with the existing small `ui/` primitive pattern. (Follow the recommended)
- Roles/admin are being removed from the product (self-signup, no administrator), but the backend (`role` field on `User`, `/admin/users`, `RequireAdmin`) and roadmap tickets FT-41 ("Users page (admin only)") still assume roles exist. This ticket avoids building anything admin-specific, but doesn't touch the backend or `User`/`useAuth()` types — that cleanup (dropping the `role` field/migration, removing `/admin/users`, replacing FT-41 with a signup flow ticket) is out of scope here and should be its own ticket before FT-41 is reached. Flagging so it isn't lost. (Needs your confirmation on scope/timing, not auto-resolved)

## Testing Guidelines
Create Vitest test files following this ticket's TDD convention (failing test first, then implementation):
- Layout guard (`web/app/(app)/layout.test.tsx` or co-located with the layout):
  - While `useAuth()` reports `loading: true`, renders the skeleton and not the children or nav shell.
  - When `loading: false` and `user: null`, calls `router.replace('/login')` and does not render children.
  - When `loading: false` and `user` is set, renders the nav shell and the children.
- Nav shell (sidebar/top-bar component tests):
  - Renders Overview, Transactions, and Profile links for a signed-in user.
  - Highlights the link matching the current pathname (mock `usePathname`).
  - Logout button calls `useAuth().logout()`.
- Mobile drawer:
  - Hidden by default; opens when the hamburger trigger is clicked.
  - Closes when a nav link inside it is clicked.
  - Closes on Escape key press.
- Mock `useAuth` and `next/navigation` (`useRouter`, `usePathname`) in all of the above — no real backend calls in unit tests.
- After the above pass, manually verify against the running backend once: log in as a seeded user, confirm the nav and logout work; resize to a mobile viewport and confirm the drawer behavior.
