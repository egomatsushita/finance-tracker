# Plan: FT-37 — Authed App Shell

## Context
FT-37 is the next ticket on the frontend roadmap (after FT-36's login page). It introduces the `(app)` route group that will wrap every authenticated page: a layout guard (redirect unauthenticated users to `/login`) and a navigation shell (desktop sidebar, mobile top-bar + drawer). This is purely scaffolding — no page content, no role gating (roles are being removed from the product in a separate future ticket, FT-45), no admin integration. The approved spec lives at `_specs/authed-app-shell.md` on branch `FT-37_authed-app-shell` (already created and checked out).

## Current state (confirmed by exploration)
- `web/app/page.tsx` — placeholder home ("Finance Tracker" heading + "1,248.50"), to move into `(app)/page.tsx` verbatim.
- `web/lib/auth.tsx` — `useAuth()` returns `{ user, loading, login, logout }`; `loading` starts `true`, resolves after `GET /users/me` hydration.
- `web/components/ui/` has `Button.tsx`, `Input.tsx`, `Card.tsx` — named exports, template-literal className concatenation (no `clsx`/`cva`), `ref` as plain prop (React 19 style). No `Skeleton` yet.
- No `web/components/nav/` directory yet. No `usePathname` usage anywhere yet.
- Test convention (`web/app/login/page.test.tsx`, `web/lib/auth.test.tsx`): `vi.hoisted` + `vi.mock('@/lib/auth', ...)` / `vi.mock('next/navigation', ...)`. Vitest config: jsdom, `@` alias → `web/`, manual `afterEach(cleanup)`.
- Tailwind v4 is CSS-first (tokens in `globals.css`); confirmed real tokens: `bg-ground`, `text-ground`, `bg-surface`, `text-surface`, `bg-ink`, `text-ink`, `text-muted-text`, `border-muted-border`, `bg-brand`, `text-brand`, `text-income`, `bg-income`, `text-expense`, `bg-expense`, `text-highlight`, `bg-highlight`. Default `md:` (768px) breakpoint.
- ESLint: single quotes, double JSX quotes, no semicolons, named exports.
- `lucide-react` is not yet a dependency — must be added.

## Implementation approach

### New/moved files (TDD: test file first, then implementation)
| File | Responsibility |
|---|---|
| `web/components/nav/navItems.ts` | `NAV_ITEMS` array — single source of truth for Overview (`/`, `Home` icon) / Transactions (`/transactions`, `ArrowLeftRight`) / Profile (`/profile`, `UserRound`). No role gating. |
| `web/components/ui/Skeleton.tsx` + test | Generic pulsing-block primitive plus an `AppShellSkeleton` composed from it (sidebar block + topbar block + content block), root has `role="status"` (no bare `data-testid`, doubles as a11y). |
| `web/components/nav/Sidebar.tsx` + test | Desktop-only (`hidden md:flex`) persistent sidebar: product mark, `NAV_ITEMS` links (active state via its own `usePathname()` call), logout button pinned to bottom. Receives `onLogout` as a prop — no `useAuth`/`useRouter` of its own. |
| `web/components/nav/TopBar.tsx` + test | Mobile-only (`flex md:hidden`) bar: product mark + hamburger (`Menu` icon, `aria-label`, `aria-expanded`). Controlled via `isOpen`/`onToggle` props. |
| `web/components/nav/MobileDrawer.tsx` + test | Slide-in panel + backdrop, controlled via `isOpen`/`onClose`. Conditionally unmounts when closed. Owns Escape-key listener (attached only while open) and backdrop-click-to-close; nav links call `onClose` on click; receives `onLogout` prop same as `Sidebar`. |
| `web/components/nav/AppShell.tsx` + test | Composes `Sidebar` + `TopBar` + `MobileDrawer`; owns `drawerOpen` state; owns the single `onLogout` handler (`await logout(); router.replace('/login')`) built from `useAuth()`/`useRouter()` and passed down; owns a `matchMedia('(min-width: 768px)')` listener that forces `drawerOpen` to `false` once the viewport crosses into desktop width (fixes the stuck-open-on-resize edge case). Renders `<main>{children}</main>`. |
| `web/app/(app)/layout.tsx` + test | `'use client'` guard: `{ user, loading } = useAuth()`. Redirect-to-`/login` happens in a `useEffect` (not inline in render) when `!loading && user === null`. Render: `loading || user === null` → `AppShellSkeleton`; else → `AppShell` wrapping `children`. |
| `web/app/(app)/page.tsx` | Moved verbatim from `web/app/page.tsx` (delete the old file — route groups mean only one `page.tsx` should serve `/`). |

Build order: `navItems.ts` → `Skeleton` → `Sidebar`/`TopBar`/`MobileDrawer` (leaf, bottom-up) → `AppShell` (composition + resize/drawer tests) → `(app)/layout.tsx` (guard tests) → move `page.tsx`.

### Key behavioral decisions
- **Guard logic**: redirect fires from a `useEffect`, never inline during render (avoids the React side-effect-during-render anti-pattern and keeps it cleanly testable with a mocked `router.replace`).
- **Active link state**: `Sidebar` and `MobileDrawer` each call `usePathname()` directly (self-contained, easy to unit test in isolation) rather than threading pathname down as a prop.
- **Logout**: single handler built once in `AppShell` from `useAuth()` + `useRouter()`, passed to `Sidebar`/`MobileDrawer` as `onLogout` — keeps those two components free of auth/router mocking in their own tests.
- **Drawer close behavior**: Escape key (listener only while open, cleaned up on close/unmount), backdrop click, and nav-link click. No focus-trapping (explicitly deferred to FT-42 per spec).
- **Resize edge case**: `matchMedia('(min-width: 768px)')` change listener in `AppShell` forces `drawerOpen = false` when crossing into desktop width — tested by stubbing `window.matchMedia` in jsdom (not implemented by default) and firing a simulated change event.
- **Icons** (`lucide-react`, new dependency): `Home` (Overview), `ArrowLeftRight` (Transactions), `UserRound` (Profile), `Menu` (hamburger), `LogOut` (logout). Decorative icons get `aria-hidden="true"`; hamburger gets an explicit `aria-label` since it has no visible text.
- No `clsx`/`cva` — continue the existing template-literal className pattern (e.g. `bg-brand/10 text-brand` for active links using Tailwind v4's opacity-modifier syntax on the custom theme tokens).

### Test coverage (Vitest + RTL, mocking `@/lib/auth` and `next/navigation`'s `useRouter`/`usePathname` throughout — no real backend calls)
- `Skeleton.test.tsx` — smoke test, `role="status"` present.
- `Sidebar.test.tsx` — correct active link per mocked pathname; logout button calls `onLogout` prop.
- `TopBar.test.tsx` — hamburger click calls `onToggle`.
- `MobileDrawer.test.tsx` — hidden when `isOpen=false`; link click / Escape / backdrop click each call `onClose`.
- `AppShell.test.tsx` — integration-style (real child components, mocked `useAuth`/`usePathname`/`matchMedia`): hamburger opens drawer, link/Escape closes it, crossing the breakpoint while open resets `drawerOpen`, logout calls `useAuth().logout()` then `router.replace('/login')`.
- `(app)/layout.test.tsx` — three cases: `loading=true` → skeleton only; `loading=false, user=null` → `router.replace('/login')` called, no children rendered; `loading=false, user` set → `AppShell` (mocked in this test file) renders with children. `AppShell` is mocked here specifically so this file tests guard logic in isolation.

## Verification
1. `cd web && npm install lucide-react`.
2. Write each test file first, confirm red (`npm run test`), then implement until green.
3. `npm run lint` — fix violations (no semicolons, single quotes, a11y rules from `eslint-config-next`).
4. `npm run build` — confirms the route group compiles with no type errors.
5. Manual check against the running backend (per repo's dev instructions — backend `uv run app/main.py`, frontend `npm run dev`):
   - Logged out, visit `/` → immediate redirect to `/login`, no flash of nav/content.
   - Log in with a seeded user → redirected to `/`, placeholder content renders inside the shell, sidebar shows Overview (active)/Transactions/Profile.
   - Logout → back to `/login`; revisiting `/` redirects again.
   - Resize below 768px → sidebar hides, top bar + hamburger appear; hamburger opens drawer with the same links; link click, outside-tap, and Escape each close it.
   - Open drawer on mobile width, then widen past 768px without closing it manually → confirm it doesn't stay stuck open.
   - Keyboard-only pass: visible focus through hamburger → drawer links (Escape closes) and through the desktop sidebar links/logout.

## Commit breakdown
1. **Setup** — `npm install lucide-react`; add `web/components/nav/navItems.ts`.
2. **Skeleton** — `Skeleton.tsx` + `AppShellSkeleton` + test.
3. **Nav components** — `Sidebar.tsx`, `TopBar.tsx`, `MobileDrawer.tsx` + their tests (related leaf components, same layer).
4. **AppShell** — composition, drawer state, resize handling, logout wiring + test.
5. **Layout guard** — `web/app/(app)/layout.tsx` + test.
6. **Move placeholder page** — `web/app/page.tsx` → `web/app/(app)/page.tsx`.
