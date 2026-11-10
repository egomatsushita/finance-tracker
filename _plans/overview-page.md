# Plan: FT-38 — Overview Page

Spec: `_specs/overview-page.md` (already written and finalized with the user). This plan implements it.

## Context

`(app)/page.tsx` is still the FT-37 placeholder (hardcoded heading + fake balance). This ticket builds the real Overview dashboard: KPI cards, an income-vs-expense trend chart, an expense-by-category donut, and a recent-transactions list — all sourced from the existing `GET /transactions/summary` (shipped in FT-32) and a small new addition to the transaction list endpoint.

Two decisions were made during planning, after actually running the project's `dataviz` skill (not just reading the ticket), that deviate from or sharpen the original ticket wording — both confirmed with the user:
- **The category chart stays a donut** (the skill's own guidance would have preferred a ranked bar chart at 11 categories, since donuts cap out around 7-8 categorical colors) — but to make the donut work cleanly, **`ExpenseCategoryEnum` shrinks from 11 to 8 categories**: drop `education`, `clothing`, `travel`. Remaining: `housing`, `utilities`, `groceries`, `transport`, `health`, `entertainment`, `savings`, `other`. This has a small blast radius since no Transactions UI exists yet to enforce the old category list.
- **Category→color mapping is fixed per category identity, never computed per-rank** — each of the 8 categories gets one fixed, validated hue (see table below); colors don't get reassigned based on which category happens to be the biggest spender this month.

The exact validated hex values (light and dark, run through the skill's `validate_palette.js` against this app's actual surfaces with `--pairs all`) are already locked into `_specs/overview-page.md`'s Functional Requirements — implementation should copy them verbatim, not re-derive.

## Backend changes

**`app/schemas/transaction.py`** — `ExpenseCategoryEnum`: remove `education`, `clothing`, `travel` members. Keep `housing`, `utilities`, `groceries`, `transport`, `health`, `entertainment`, `savings`, `other`. No DB migration needed (`category` is a plain string column, not a DB enum).

**`app/schemas/params.py`** — add to `FilterParams` (right after `order_by`):
```python
sort_dir: Literal["asc", "desc"] = "asc"
```
`TransactionFilterParams` inherits it automatically. Default `"asc"` preserves every existing caller's behavior exactly.

**`app/repositories/transaction.py`** — in `get_all()`, change the ordering line to apply `.desc()` conditionally:
```python
order_column = ORDER_BY_COLUMNS[filter_params.order_by]
if filter_params.sort_dir == "desc":
    order_column = order_column.desc()
query = query.offset(...).limit(...).order_by(order_column)
```
No changes needed to `app/services/transaction.py` (`get_all()` already passes `filter_params` straight through) or `app/routers/transaction.py` (already takes `TransactionFilterParamsDep`).

### Backend tests (TDD — write these first, confirm they fail, then implement)

- **`tests/routers/test_transactions.py`**: add a fixture with 3+ transactions at distinct `transaction_date`s (mirroring the existing `member_transaction` fixture's construction), and tests: `sort_dir=desc` reverses order; omitting `sort_dir` preserves today's ascending order; `sort_dir=bogus` → `422`.
- **`tests/services/test_transaction_service.py`**: same ordering assertions at the service layer (`TestGetAll`), with a multi-transaction fixture.
- Update the two `category="clothing"` usages (lines ~119, ~163) to a remaining valid category (e.g. `"entertainment"`), since `clothing` no longer exists in the enum.
- Add a quick regression test (or extend an existing creation test) confirming `POST /transactions/` with `category="clothing"` now returns `422`.

Run `uv run pytest tests/routers/test_transactions.py tests/services/test_transaction_service.py -v`, then full `uv run pytest` for a no-regression check.

## Frontend changes

**`web/lib/types.ts`** — shrink the `ExpenseCategory` union to match the backend enum (drop `'education' | 'clothing' | 'travel'`).

**`web/lib/queries.ts`** (new) — React Query hooks using the existing `api.get<T>`:
```ts
export function useTransactionSummary() {
  return useQuery({ queryKey: ['transactions', 'summary'], queryFn: () => api.get<TransactionSummary>('/transactions/summary') })
}
export function useRecentTransactions(limit = 5) {
  return useQuery({ queryKey: ['transactions', 'recent', limit], queryFn: () => api.get<Transaction[]>(`/transactions/?order_by=transaction_date&sort_dir=desc&limit=${limit}`) })
}
```

**`web/lib/format.ts`** (new):
```ts
export function formatMoney(value: string): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))
}
export function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}
```
Callers apply `font-mono`/tabular-nums via className at the render site (existing convention), not inside the helper.

**`web/lib/useColorScheme.ts`** (new) — mirrors the `matchMedia`/`useEffect` pattern already in `AppShell.tsx` (lines ~28-33) and the inline theme script in `app/layout.tsx`:
```ts
'use client'
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (matches: boolean) => setScheme(matches ? 'dark' : 'light')
    apply(mql.matches)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return scheme
}
```
Chart components use this to pick the light/dark hex from the fixed category table (spec's table) and from `--income`/`--expense`.

**Add `recharts`** to `web/package.json` dependencies (not yet installed; already the library named in `_plans/dashboard.md`'s original tech choices — SVG-based, declarative API, right-sized for two chart types).

**`web/components/charts/IncomeExpenseTrendChart.tsx`** (new) — grouped bar chart of `by_month`:
- `<BarChart data={by_month}>` with `<Bar dataKey="income" fill="var(--income)">` / `<Bar dataKey="expense" fill="var(--expense)">`.
- Mark specs from the dataviz skill: `barSize` ≤ 24px; `radius={[4,4,0,0]}` (4px rounded data-ends); `barGap` small enough to read as a 2px surface gap between the income/expense bars within a month; `<CartesianGrid>` hairline 1px **solid** (not recharts' dashed default), horizontal only; `<Legend/>` present (mandatory for 2 series); `<LabelList position="top" formatter={formatMoney}>` on both bars (direct value labels at bar tips); `<Tooltip/>` present (recharts ships this by default — don't disable).
- Empty state: if `by_month` is empty, render an inviting empty message instead of the chart.

**`web/components/charts/CategoryDonutChart.tsx`** (new) — donut of `by_category` filtered to `kind === 'expense'`:
- Uses the fixed category→hex table from the spec (via `useColorScheme()` to pick light/dark), keyed by category name — never by sort position.
- Slices **ordered** by total descending for readability (sorting is fine; only the *color* assignment must stay fixed per category).
- Legend present (8 potential series); direct slice labels via `formatCategoryLabel` + `formatMoney`.
- Empty state: zero expense transactions → inviting empty message, not a broken/zero-slice donut.

**`(app)/page.tsx`** (replace placeholder, **preserve `export const instant = false`**):
- KPI row: three `Card`s — Net (`text-highlight` + `font-mono`), Income (`text-income`), Expense (`text-expense`) — via `formatMoney` on `summary.data`.
- `IncomeExpenseTrendChart` fed `summary.data?.by_month`.
- `CategoryDonutChart` fed `summary.data?.by_category`.
- "Recent transactions" list from `useRecentTransactions(5)`, "No transactions yet" when empty.
- One orchestrated skeleton (`OverviewSkeleton`, new — add alongside `AppShellSkeleton` in `web/components/ui/Skeleton.tsx`, same composition style) while either query is loading; no per-section spinners.
- Minimal `isError` fallback on both queries (defensive — spec doesn't mandate dedicated error UI, but don't render `undefined`-shaped KPIs on a failed fetch).

### Frontend tests (TDD — write failing tests first, per this repo's established convention)

- `web/lib/queries.test.ts` (new) — establishes the React Query hook test pattern (none exists yet): `renderHook` wrapped in a local `QueryClientProvider`, mocking `api.get`; assert correct URL/params for both hooks.
- `web/lib/format.test.ts` (new) — `formatMoney`/`formatCategoryLabel` unit tests (typical values, zero, capitalization).
- `web/lib/useColorScheme.test.ts` (new) — mirror `AppShell.test.tsx`'s `stubMatchMedia` helper; assert initial state and live update on a simulated `change` event.
- `web/components/charts/IncomeExpenseTrendChart.test.tsx` / `CategoryDonutChart.test.tsx` (new) — smoke-level: labels/legend present for non-empty data, sort order correct for the donut, empty-state message renders for empty data.
- `web/app/(app)/page.test.tsx` (new) — mock `useTransactionSummary`/`useRecentTransactions`; cases: loading → skeleton only; loaded → KPI values + chart containers + recent list render; zero-transactions → empty states everywhere; fewer-than-5 recent → exact count, no padding.

## Verification

- Backend: `uv run pytest` (full suite, zero regressions).
- Frontend: `npm run test`, `npm run lint`, `npm run build` (all clean; build also confirms `recharts` SSR/type compatibility with Next 16).
- Manual, against the running app:
  1. Seed/create transactions across all 8 expense categories and a few months.
  2. Load `/`: KPI cards correct, trend chart shows grouped bars with legend + direct labels, donut shows all 8 categories in their fixed colors ranked by size, recent list shows the 5 newest.
  3. Toggle OS/browser color scheme while the page is open — chart colors update immediately, no reload.
  4. Brand-new/empty account — inviting empty states everywhere, no console errors.
  5. Confirm `GET /transactions/` without `sort_dir` is unchanged (ascending, as before).
