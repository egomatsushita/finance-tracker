# Spec for Frontend Scaffold

branch: FT-34_frontend-scaffold

## Summary
Create the initial `web/` directory as a Next.js (App Router) + TypeScript + Tailwind v4 project that will host the Finance Tracker dashboard (see `_plans/dashboard.md`). This PR delivers only the project scaffold — fonts, color tokens, lint/format config, and env wiring — with a single placeholder home page. No auth, no API calls, no real pages yet. Goal: `npm run dev` renders an empty themed shell proving the toolchain and design tokens are wired correctly.

## Functional Requirements
- New `web/` directory at repo root, initialized as a Next.js App Router + TypeScript project.
- Tailwind v4 configured and working (utility classes apply in the browser).
- IBM Plex Sans and IBM Plex Mono loaded (via `next/font`) and set as the body/UI and tabular-numeral font roles respectively, applied in `app/layout.tsx`.
- Light/dark color tokens defined (CSS variables or Tailwind theme extension) matching the palette in `_plans/dashboard.md` (ground, surface, ink, muted text/borders, brand accent, income/expense, signature highlight), each with light and dark values, switching via `prefers-color-scheme`.
- `app/layout.tsx` sets up the HTML shell, fonts, and token-driven background/text colors (no sidebar, no auth providers — those come in later tickets).
- A single placeholder `app/page.tsx` rendering minimal content (e.g. product name) enough to visually confirm fonts/colors/dark-mode are active.
- Lint/format config for the `web/` project (ESLint + Next.js config, Prettier or equivalent), consistent with a TypeScript/React project; does not need to match the Python ruff setup.
- `web/.env.local` (or `.env.local.example` if `.env.local` should stay untracked) defining `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
- `web/` has its own `package.json`/lockfile, isolated from the Python project; root `README.md` is not required to change in this ticket.

## Possible Edge Cases
- `prefers-color-scheme` toggling at the OS level should flip tokens without a page reload.
- Running `npm install`/`npm run dev` from a clean clone of `web/` should work with no undocumented manual steps.
- Font loading should not cause layout shift or console warnings (use `next/font` rather than manual `<link>` tags).
- Tailwind v4 config syntax differs from v3 — confirm the project uses v4's CSS-first config, not a stale v3 `tailwind.config.js` pattern.
- `.env.local` must not be committed if it's meant to be developer-local; decide between committing a `.env.local.example` vs. documenting the variable in a README snippet.

## Acceptance Criteria
- `cd web && npm install && npm run dev` starts a dev server with no errors.
- Visiting the dev server in a browser shows the placeholder page styled with IBM Plex Sans, using the light-mode token colors.
- Toggling the OS/browser to dark mode switches the page to the dark-mode token colors without a manual reload.
- `npm run lint` (or equivalent) passes with no errors on the scaffolded code.
- No backend/Python files are modified; changes are scoped to the new `web/` directory (and possibly root `.gitignore`).

## Open Questions
- Should `web/.env.local` be committed as-is (since the default value is a safe local dev URL) or should the repo instead track `web/.env.local.example` and gitignore `.env.local`? Recommend the latter for convention consistency, but flagging for confirmation. (Proceed with latter.)
- Should Tailwind's dark mode strategy be purely `prefers-color-scheme` (media-based) or also support a manual toggle class now, even though the toggle UI itself is out of scope until the later "polish" ticket? Recommend wiring the `class`-based dark mode strategy now (cheap) so FT-42 doesn't need to revisit `layout.tsx`, even though no toggle UI ships here. (Follow with the recommendation)
- Create `/design` route for displaying all the application's style example. (Resolved: not needed — `layout.tsx` + the placeholder home page already exercise every font/token decision, so a dedicated showcase route would be redundant for this ticket.)

## Testing Guidelines
No backend tests apply to this ticket. For the frontend, keep verification manual and lightweight rather than introducing a test runner this early:
- Manually verify `npm run dev` boots cleanly and the placeholder page renders with correct fonts/colors in both light and dark OS modes.
- Manually verify `npm run build` completes with no type or lint errors.
- Do not add Jest/Playwright/Vitest in this ticket — defer any frontend test harness decision to a later ticket, consistent with `_plans/dashboard.md`'s "Out of scope" list (no e2e harness for first delivery).
