# Spec for Overview Page

branch: FT-38_overview-page

## Summary

`(app)/page.tsx` is still the FT-37 placeholder ("Finance Tracker" / a hardcoded balance). This ticket replaces it with the real Overview dashboard: KPI cards (net/income/expense) and an income-vs-expense trend chart sourced from the existing `GET /transactions/summary` (shipped in FT-32; `TransactionSummary` is already in `web/lib/types.ts`), an expense-by-category donut, and a recent-transactions list. Getting "recent" transactions (newest first) requires one small, backward-compatible backend addition — the list endpoint currently has no descending sort.

## Functional Requirements

- **Backend (small addition, mirrors the FT-32 precedent of adding the smallest necessary backend support for a frontend need):**
  - Add `sort_dir: Literal["asc", "desc"] = "asc"` to `FilterParams` (`app/schemas/params.py`), inherited by `TransactionFilterParams`. Default `"asc"` preserves every existing endpoint's current behavior exactly.
  - `TransactionRepository.get_all()` (`app/repositories/transaction.py`) applies `.desc()` on the `order_by` column when `sort_dir == "desc"`, otherwise unchanged `.asc()` (implicit default) ordering.
  - No other transaction/user endpoint behavior changes; this is additive only.
- **`web/lib/queries.ts`** (new, per `_plans/dashboard.md`'s planned file): React Query hooks —
  - `useTransactionSummary()` — `GET /transactions/summary` via the existing `api.get<TransactionSummary>`.
  - `useRecentTransactions(limit = 5)` — `GET /transactions/?order_by=transaction_date&sort_dir=desc&limit=5`.
- **`web/lib/format.ts`** (new, per `_plans/dashboard.md`): `formatMoney(value: string): string` (parses the API's decimal string, formats via `Intl.NumberFormat`, renders with `font-mono`/tabular-nums per the existing typography convention); `formatCategoryLabel(category: string): string` (e.g. `"groceries"` → `"Groceries"`).
- **Add `recharts`** to `web/package.json` dependencies (not yet installed) — already the library named in `_plans/dashboard.md`'s original tech choices. It renders SVG (real DOM nodes), so chart elements can be themed with the same CSS custom properties (`--income`/`--expense`) the rest of the app uses for light/dark, and its declarative component API (`<BarChart><Bar/></BarChart>`) matches this codebase's component style. Heavier alternatives (Nivo, ECharts) are overkill for two chart types; lower-level ones (Visx, raw D3) would mean writing more boilerplate for something this simple.
- **Reduce `ExpenseCategoryEnum` from 11 to 8 categories** (`app/schemas/transaction.py`): drop `education`, `clothing`, `travel` (lowest-frequency for a personal tracker). Remaining set: `housing`, `utilities`, `groceries`, `transport`, `health`, `entertainment`, `savings`, `other`. This is a pre-existing enum with no dedicated frontend form yet (the Transactions page doesn't exist until a later ticket), so the blast radius is small — update `web/lib/types.ts`'s `ExpenseCategory` union to match, and update the two `tests/services/test_transaction_service.py` fixtures that use `category="clothing"` (lines 119, 163) to a remaining valid category (e.g. `"entertainment"`). No migration needed — `category` is a plain string column, not a DB-level enum constraint.
- **`web/components/charts/`** (new):
  - `IncomeExpenseTrendChart.tsx` — grouped bar chart of `by_month` (income bar + expense bar per month).
  - `CategoryDonutChart.tsx` — donut of `by_category`, **expense categories only** (income categories are few and already summarized by the Income KPI card — see Open Questions).
  - **Category-to-color mapping is fixed per category identity, never computed per-request rank** — if a category's color were assigned by "this month's #1, #2, #3 spender," the same category (e.g. "groceries") would repaint to a different hue next month as spending patterns shift, which is the exact anti-pattern the project's dataviz skill forbids ("color follows the entity, never its rank"). With exactly 8 categories now, each gets its own fixed, validated slot — no catch-all bucket needed:

    | Category | Light | Dark |
    |---|---|---|
    | `groceries` | `#2a78d6` (blue) | `#3987e5` |
    | `housing` | `#1baf7a` (aqua) | `#199e70` |
    | `transport` | `#eda100` (yellow) | `#c98500` |
    | `utilities` | `#008300` (green) | `#008300` |
    | `entertainment` | `#4a3aa7` (violet, light) | `#b347d1` (violet, dark — adjusted from the skill's reference step; see below) |
    | `health` | `#e34948` (red) | `#e66767` |
    | `savings` | `#e87ba4` (magenta, light) | `#d6548a` (magenta, dark — adjusted; see below) |
    | `other` | `#eb6834` (orange) | `#d95926` |

    Validated with the dataviz skill's `validate_palette.js` against this app's actual surfaces (`#ffffff` light / `#111b2e` dark), using `--pairs all` (not just adjacent-pair) since any two donut slices can end up visually adjacent depending on slice order. Light passes all 6 checks using the skill's reference hex values unchanged (worst-pair CVD comfortably clear, two slots WARN on contrast — mitigated by mandatory direct labels). Dark mode's reference violet/magenta steps clash with blue/aqua under protanopia/deuteranopia on our specific navy surface (`#111b2e`) at an all-pairs check — the skill's own reference validation only checked adjacent pairs, which hid this. Followed the skill's "snap-to-passing" procedure (hold hue, adjust lightness/chroma, re-run) to land on `#b347d1`/`#d6548a`: all 6 checks pass, worst all-pairs CVD ΔE 8.9 (deuteranopia), in the 8–12 floor band — legal only with secondary encoding, mitigated by the mandatory legend + direct slice labels this chart already has (2+ series). Slices are still **ordered** by total descending within the donut for readability; only the *color* assignment is fixed per category, not per rank.
  - Both read chart colors from the CSS custom properties already defined in `globals.css` (`--income`, `--expense`) plus the fixed hex table above, rather than hardcoding ad-hoc values, so they stay correct across the light/dark toggle. Since theme switching today is pure DOM (`document.documentElement.classList.toggle('dark', ...)` in `app/layout.tsx`'s inline script, no React state), add a small `useColorScheme()` hook (`web/lib/useColorScheme.ts` or colocated with the chart components) that reads `matchMedia('(prefers-color-scheme: dark)')` and re-renders on change, so the chart re-resolves light vs. dark hex values live without a full reload.
- **`(app)/page.tsx`** (replace placeholder): KPI row (Net in `text-highlight` + `font-mono`, Income in `text-income`, Expense in `text-expense`, using `Card`), the trend chart, the category donut, and a "Recent transactions" list (last 5, newest first, reusing existing formatting helpers). One orchestrated loading skeleton (reusing `components/ui/Skeleton.tsx`'s pattern) while `useTransactionSummary()`/`useRecentTransactions()` are loading — not per-section spinners.
- Icons via `lucide-react` (already a dependency) for any list/empty-state iconography; never emoji.

## Possible Edge Cases

- Zero transactions: KPIs show `0`/`0.00`, the trend chart and donut show an inviting empty state (not a broken zero-slice/zero-bar render), and the recent list shows a "No transactions yet" message.
- Only income or only expense exists: the missing side's KPI is `0` (not absent); the donut (expense-only) shows its own empty state if there are zero expense transactions, independent of whether income exists.
- Fewer than 5 transactions total: the recent list shows however many exist, no padded/placeholder rows.
- `amount`/`total_income`/`total_expense`/`net`/category `total` are all decimal **strings** from the API (not numbers) — `formatMoney` must parse them without floating-point display drift for the rendered amounts (display-only; no arithmetic is redone client-side beyond what the summary endpoint already aggregated).
- Dark/light toggle while the Overview page is open: chart colors must update immediately via `useColorScheme()`'s `matchMedia` listener, matching the rest of the app's live theme switching.
- A user with transactions in all 8 expense categories: each gets its own distinct, fixed slice color (no catch-all bucket needed at this category count).
- `sort_dir=desc` must not change `GET /transactions/` for any existing caller that omits it (default `"asc"` is the current, unchanged behavior) — this is additive, not a breaking change to the list endpoint.
- A user with many transactions: `useRecentTransactions(5)` relies on the new `sort_dir=desc&limit=5` server-side slice, not a client-side over-fetch, so it stays correct regardless of total transaction count.

## Acceptance Criteria

- `(app)/page.tsx` renders real KPI cards (Net/Income/Expense) sourced from `GET /transactions/summary`, replacing the FT-37 placeholder.
- The income-vs-expense trend chart renders from `by_month` and the category donut renders from `by_category` (expense only).
- The recent-transactions list shows up to 5 transactions, newest first, via the new `sort_dir=desc` param.
- A brand-new account (zero transactions) sees inviting empty states on every section, not errors or broken charts.
- One orchestrated skeleton covers the loading window; no scattered per-section spinners.
- Existing `GET /transactions/` behavior (ordering, filters, pagination) is unchanged for any request that doesn't pass `sort_dir`.
- `uv run pytest`, `npm run build`, `npm run lint`, and `npm run test` all pass with no errors.
- Manual check with seeded data: toggling the OS/browser color scheme updates chart colors immediately, without a page reload.

## Open Questions

- Should the category donut include both income and expense categories, or expense only? Recommend expense-only — matches `_plans/dashboard.md`'s original intent, and income categories are few and already summarized by the Income KPI card. (Follow the recommended) - expense only
- Should "recent transactions" use a new backend `sort_dir` param, or should the frontend over-fetch (e.g. `limit=100`) and sort/slice client-side to avoid any backend change? Recommend the backend param — it's correct at any transaction count and is a trivial, backward-compatible addition, consistent with FT-32's precedent of adding minimal backend support for a frontend need. (Follow the recommended) - update the backend, frontend should not over-fetch.
- Chart type for the income-vs-expense trend: grouped bar chart vs. a two-series area chart? Recommend grouped bars — clearer month-over-month side-by-side comparison, and avoids area-overlap readability issues at dashboard card sizes. (Follow the recommended) - grouped bars
- Why `recharts` over other charting libraries? SVG-based (themeable via the same CSS custom properties as the rest of the app, unlike canvas-based Chart.js), declarative React API matching this codebase's style, and right-sized for two chart types — see the rationale added to Functional Requirements above.

## Testing Guidelines

- Backend: add/extend a test in `tests/routers/test_transactions.py` (or a new `TestSortDir` class) confirming `sort_dir=desc` reverses ordering for a given `order_by` field, and that omitting `sort_dir` preserves today's ascending behavior unchanged. Update `tests/services/test_transaction_service.py`'s two `category="clothing"` fixtures to a remaining valid category so the suite doesn't break after the enum reduction; confirm the dropped categories (`education`/`clothing`/`travel`) now `422` on `POST /transactions/`.
- Frontend (Vitest + React Testing Library, TDD — write failing tests first per the established FT-36+ convention):
  - `useTransactionSummary()`/`useRecentTransactions()`: mock `api.get`, confirm correct URL/params and that the hook's data shape matches `TransactionSummary`/`Transaction[]`.
  - `formatMoney`/`formatCategoryLabel`: unit tests for typical values, zero, and category label casing.
  - Overview page: renders KPI values from a mocked summary response; renders the trend chart and donut (smoke-level — presence of expected chart containers/labels, not pixel-level chart assertions); renders the recent-transactions list from a mocked response; shows the shared skeleton while loading; shows empty states when summary/recent-transactions are both empty.
  - `useColorScheme()`: unit test that it reflects the current `matchMedia` match state and updates on a simulated `change` event.
