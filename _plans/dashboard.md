# Finance Tracker — Dashboard Plan

## Context

The Finance Tracker FastAPI backend exposes JWT-authenticated REST endpoints for **users** and **transactions**, but has no UI. We're building a clean, professional, responsive web dashboard that showcases both resources. The dashboard doubles as a demo/portfolio surface, so it must look deliberately designed (finance-industry palette + typography) while staying minimal and not over-engineered.

Goal: a member can log in, view a financial overview, and manage their transactions and profile; an admin can additionally manage users — all against the existing API with the smallest possible backend additions.

**Stack (confirmed):** Next.js (App Router) + TypeScript + Tailwind v4, living in a new `web/` directory in this repo. Data aggregates come from a new backend summary endpoint.

---

## API facts the frontend is built against

- **Base URL:** `http://127.0.0.1:8000` (`UVICORN_HOST`/`UVICORN_PORT`).
- **Login:** `POST /auth/token`, **form-encoded** (`username`, `password`), returns `{ access_token, token_type: "bearer" }`. HS256, ~30 min, **no refresh token** → handle 401 by redirecting to login.
- **Auth header:** `Authorization: Bearer <token>`.
- **Users:** `/admin/users/` (admin only — GET list w/ `offset`/`limit`/`order_by`, POST, and `/{user_id}` GET/PUT/DELETE); `/users/{user_id}` (self GET/PUT). Roles: `admin`, `member`. Read shape: `id, username, email, is_active, role, created_at, updated_at`.
- **Transactions:** `/transactions/` CRUD (GET list, POST, `/{id}` GET/PATCH/DELETE), auto-scoped to the token's user. Filters: `kind` (`income`/`expense`), `category`, `transaction_date_from`/`_to`, `offset`, `limit` (max 100), `order_by`. Read shape: `amount (Decimal), kind, category, description, transaction_date, id, user_id, created_at, updated_at`. **No `currency` field; no total-count in list responses.**
- **Categories (Pydantic-enforced):** income → `salary, investment, rental, gift, other`; expense → `housing, utilities, groceries, transport, health, entertainment, education, clothing, travel, savings, other`.

---

## Part A — Backend prerequisites (minimal, required)

These are the smallest changes needed to make a browser dashboard function. Each follows the existing **Router → Service → Repository** pattern and raises domain errors from `app/errors/` (never `HTTPException`).

### A1. CORS middleware (mandatory — browser is blocked without it)
- Add `CORSMiddleware` in `app/main.py`.
- Add a `cors_origins: list[str]` setting to `app/config/settings.py` (+ `.env.example`), default `["http://localhost:3000"]`.
- Allow credentials off (we use bearer header, not cookies), allow methods `GET/POST/PUT/PATCH/DELETE/OPTIONS`, allow `Authorization`/`Content-Type` headers.

### A2. Current-user endpoint (mandatory — frontend can't otherwise learn its id/role)
- Add `GET /users/me` → returns `UserReadSchema` for the authenticated user.
- Implement in `app/routers/user.py`, **declared before** `/{user_id}` so the static path wins over the UUID route. Reuse `CurrentUserDep` (`app/dependencies/auth.py`) for the id and the existing user service `get`/read path.
- Frontend calls this right after login to populate auth context (id, role, profile).

### A3. Transaction summary endpoint (for the overview page)
- Add `GET /transactions/summary` → returns server-computed aggregates for the current user, e.g.:
  ```json
  {
    "total_income": "0.00",
    "total_expense": "0.00",
    "net": "0.00",
    "by_category": [{ "kind": "expense", "category": "groceries", "total": "0.00" }],
    "by_month": [{ "month": "2026-10", "income": "0.00", "expense": "0.00" }]
  }
  ```
- New schema in `app/schemas/transaction.py`; service method in `app/services/transaction.py`; repository aggregation in `app/repositories/transaction.py` using `func.sum` + `group_by` (scoped to `current_user.id`), `flush()` only. Optional date-range filter params mirroring the list endpoint.
- Add endpoint metadata/examples to `app/docs/` per the project convention.
- Add pytest coverage under `tests/routers/` (in-memory SQLite) for `/users/me` and `/transactions/summary` — do not run unless asked.

> Note: `/transactions/` list still returns no total count. For pagination we use "next/prev enabled by whether a full page came back" rather than a true total — acceptable for this minimal dashboard. (Adding `X-Total-Count` is out of scope unless you want it later.)

---

## Part B — Design system

Applying the Anthropic frontend-design skill (grounded in subject, distinctive-over-default, one bold element) and UI/UX Pro Max (SVG icons not emoji, hover feedback, contrast, responsive). Finance brief → precise, trustworthy, quietly premium; avoid the cliché warm-cream/terracotta and acid-green-on-near-black defaults.

### Color palette (light-first, full dark-mode support)
| Role | Light | Dark |
|------|-------|------|
| Ground / background | `#FBFCFD` | `#0B1220` |
| Surface / card | `#FFFFFF` | `#111B2E` |
| Ink / primary text | `#0B1F3A` | `#E8EDF5` |
| Muted text / borders | `#5B6B82` / `#E3E7EC` | `#8A99B3` / `#1E2A42` |
| Brand accent (interactive) | `#0E7C66` (deep teal-green) | `#2BB89A` |
| Income / positive | `#2E7D5B` | `#56C08D` |
| Expense / negative | `#C2453E` | `#E57A72` |
| Signature highlight (the one bold element) | `#C9A227` (restrained gold) — used sparingly for the hero balance figure / key KPI | same |

Semantic income/expense colors double as the categorical chart palette; for charts follow the **dataviz skill** (`references/palette.md`) when writing chart code.

### Typography (two related roles — reads as one system)
- **IBM Plex Sans** — all UI and body. Slightly technical, finance-appropriate, excellent legibility; deliberately not the default Inter.
- **IBM Plex Mono** — tabular numerals in tables and KPI figures for clean column alignment.
- All monetary values render with `tabular-nums`. Numbers formatted via `Intl.NumberFormat`. No `currency` symbol forcing — show as plain decimal (API has no currency); display a configurable locale/symbol constant.
- Avoid skill "tells": no ALL-CAPS eyebrow labels, no single-word italic emphasis, no `→` on buttons, no middle-dot metadata, sentence case throughout.

### Layout & interaction
- Persistent left sidebar nav (collapses to a top bar / drawer on mobile), role-aware: members see Overview, Transactions, Profile; admins additionally see Users.
- One orchestrated load state per page (skeletons), not scattered fade-ins. Visible keyboard focus, `prefers-reduced-motion` respected, mobile-first responsive.
- Icons: `lucide-react` (SVG), never emoji.

---

## Part C — Frontend structure (`web/`)

Next.js App Router, TypeScript, Tailwind v4.

```
web/
  app/
    layout.tsx                # fonts, Providers (auth + React Query), theme
    login/page.tsx            # public login
    (app)/                    # authed group, guarded by layout
      layout.tsx              # auth guard + sidebar shell
      page.tsx                # Overview (dashboard home)
      transactions/page.tsx   # transactions table + filters + CRUD
      users/page.tsx          # admin-only users table + CRUD
      profile/page.tsx        # self profile view/edit
  components/
    ui/                       # Button, Input, Select, Modal, Table, Card, Badge, Skeleton
    charts/                   # KPI cards, bar/donut (Recharts)
    transactions/ users/      # resource-specific forms + rows
  lib/
    api.ts                    # typed fetch wrapper (Bearer, 401 -> logout)
    auth.tsx                  # AuthProvider/useAuth (token + current user)
    queries.ts                # React Query hooks per resource
    format.ts                 # money/date/category formatting + category enums
    types.ts                  # TS types mirroring API schemas
  .env.local                  # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Dependencies (kept lean)
`next`, `react`, `typescript`, `tailwindcss` v4, `@tanstack/react-query` (clean auth'd data/caching/mutations for 2 resources), `react-hook-form` + `zod` (forms mirroring backend validation incl. kind↔category rules), `recharts` (overview charts), `lucide-react` (icons). No component library — small hand-built `ui/` primitives keep it minimal and on-brand.

### Auth flow
- `lib/api.ts`: base wrapper reading `NEXT_PUBLIC_API_URL`; attaches `Authorization: Bearer`; on `401` clears token and redirects to `/login`. Login uses `application/x-www-form-urlencoded` against `POST /auth/token`.
- `AuthProvider`: stores token in `localStorage` (bearer model; note the XSS tradeoff vs httpOnly cookies — acceptable for this local/demo dashboard), fetches `GET /users/me` on load to hydrate `{ id, role, ... }`, exposes `login`/`logout`/`user`.
- `(app)/layout.tsx` redirects unauthenticated users to `/login`; `/users` route guarded to `role === "admin"` (hidden from nav + redirect for members).

### Pages
1. **Login** — centered card, product mark, the one gold-accented element. Username/password, inline error ("Incorrect username or password") on 401, active-voice "Sign in".
2. **Overview** — KPI row (Net balance in signature gold+mono, Income, Expense) from `GET /transactions/summary`; a bar/area chart of income-vs-expense by month and a donut/bar of expense-by-category (dataviz-skill palette); a "Recent transactions" list (last ~5). Inviting empty states.
3. **Transactions** — filter bar (kind, category dependent on kind, date range), sortable via `order_by`, offset/limit pagination (next/prev by page fullness). Create/Edit in a modal with `react-hook-form`+`zod` enforcing `amount > 0` and valid category-for-kind; delete with confirm. Income green / expense red badges.
4. **Users (admin only)** — table (username, email, role, active, created) with `offset`/`limit`/`order_by`; create/edit modal (`UserCreateSchema`/`UserUpdateAdminSchema` incl. role + is_active + password); delete with confirm. Surfaces 409 conflicts (duplicate username/email) and 403 cleanly.
5. **Profile** — view/edit own record via `GET`/`PUT /users/{id}` using the id from auth context; `UserUpdateSelfSchema` fields only (username, email, password) — no role/is_active.

### Cross-cutting
- Typed error handling mapping API error envelopes to friendly messages; consistent toast on mutation success/failure.
- Loading skeletons; disabled/pending button states on mutations.
- Dark/light theme via `prefers-color-scheme` + a toggle.

---

## Running locally
- Backend: `uv run app/main.py` (http://127.0.0.1:8000), with `cors_origins` including `http://localhost:3000`.
- Frontend: `web/` → `npm install` then `npm run dev` (http://localhost:3000).
- Optionally extend the existing `docker-compose` to add the `web` service (follow-up, not required for first delivery).

## Verification (end-to-end)
1. Add CORS + `/users/me` + `/transactions/summary`; add pytest tests for the two new endpoints (`uv run pytest tests/routers/...`) — run when you ask.
2. Seed/create an admin and a member user (admin via `/admin/users`, or existing seed migration).
3. Start both servers. In the browser: log in as member → Overview shows summary numbers and charts; create/edit/filter/delete a transaction and confirm the overview updates; edit profile. Log in as admin → Users page CRUD works and the Users nav is hidden for members. Confirm 401 (expired token) redirects to login, and mobile layout (sidebar → drawer) is usable.
4. Check accessibility basics: keyboard focus visible, contrast, reduced-motion.

## Out of scope (can follow up)
Refresh tokens, `X-Total-Count`/true pagination totals, httpOnly-cookie auth, CSV export, multi-currency, SSR of authed data, e2e test harness, dockerizing the web service.
