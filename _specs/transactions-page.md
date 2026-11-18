# Spec for Transactions Page

branch: FT-39_transactions-page

## Summary

Build the authenticated `/transactions` page (the nav link already exists in `components/nav/navItems.ts`). It lists the current user's transactions in a table with server-side filtering (kind, category, date range), offset/limit pagination, and full CRUD via a create/edit modal and a delete confirmation. All data is fetched and mutated against the existing `/transactions` API with TanStack Query; forms validate with zod + react-hook-form, including the kind↔category rule the backend enforces.

This is frontend-only work — the backend API (list/filter/create/update/delete) already exists and is unchanged.

## Functional Requirements

### Page & data
- New route `web/app/(app)/transactions/page.tsx` rendering a client component (e.g. `TransactionsClient.tsx`), consistent with the Overview page structure (server page → client component, wrapped by the existing `(app)` layout / `AppShell`).
- Fetch rows from `GET /transactions/` via a new query hook in `lib/queries.ts`. The query key must include all filter + pagination + sort params so cache entries stay distinct.
- Add `Transaction` CRUD types/payloads to `lib/types.ts` as needed (create/update payloads).

### Table
- Columns: date, kind, category (with its lucide icon via `getCategoryIcon`), description, amount, and a row actions affordance (edit / delete).
- Amount styled by kind (income/expense tones) and formatted with `formatMoney`; category rendered with `formatCategoryLabel`.
- The `transaction_date` column header toggles `sort_dir` asc/desc (sorting is scoped to `transaction_date` only; `created_at`/`updated_at` ordering is not exposed). Default `order_by=transaction_date&sort_dir=desc` to show most recent first.
- Loading state uses a skeleton consistent with `components/ui/Skeleton`; empty state shows a friendly "no transactions" message; error state mirrors the Overview page's error copy pattern.

### Filters
- Filter controls for `kind` (income / expense / all), `category`, and `transaction_date_from` / `transaction_date_to`.
- The category options shown depend on the selected kind (income categories vs expense categories). When kind is "all", the category filter stays **enabled** and shows the union of all categories.
- Changing any filter resets pagination to the first page (`offset = 0`).
- Filters map to the documented query params: `kind`, `category`, `transaction_date_from`, `transaction_date_to`.

### Pagination (offset/limit via page-fullness)
- Fixed page size of `limit = 10` (matches the API default). Navigation via Previous / Next.
- There is no total-count endpoint, so "is there a next page?" is derived from page fullness: if the current page returned exactly `limit` rows, a next page is assumed to exist; if it returned fewer, Next is disabled.
- Previous is disabled when `offset === 0`.
- `offset` advances/retreats by `limit`.

### Create / edit modal
- Add a minimal reusable `Modal`/`Dialog` primitive in `components/ui/` (none exists yet): overlay + panel, close on backdrop click and Escape, focus trap, `role="dialog"` / `aria-modal`. A single transaction modal component built on it drives both create and edit (edit pre-fills from the selected row).
- Fields: amount, kind, category (options driven by selected kind), description (optional), transaction_date. Kind/category use a styled `Select` primitive (see Design Decisions).
- Validation with zod via `@hookform/resolvers` + react-hook-form:
  - `amount` > 0.
  - `kind` is income|expense.
  - `category` must be valid **for the chosen kind** (the kind↔category rule) — mirror the backend's `_VALID_CATEGORIES` mapping.
  - `transaction_date` required.
  - `description` optional, max length consistent with backend (255).
- Create calls `POST /transactions/`; edit calls `PATCH /transactions/{id}`. On success, invalidate the transactions list query (and the overview/summary queries so the dashboard stays in sync) and close the modal.
- Changing `kind` in the form clears/revalidates `category` so an invalid pairing can't be submitted.
- Surface server validation errors (422 `ApiErrorBody`) back onto the form.

### Delete with confirm
- Row delete opens a confirmation prompt before calling `DELETE /transactions/{id}`.
- On success, invalidate the list (and summary) queries. If this empties the current (non-first) page, show the empty state with a "no transactions yet" message rather than auto-stepping back to the previous page.

### Mutations
- All mutations go through TanStack Query `useMutation` hooks in `lib/queries.ts`, reusing the `api` client (which already attaches the CSRF header for non-GET requests).

## Possible Edge Cases
- Kind changed in the form while an incompatible category is selected → category must reset/revalidate, not silently submit an invalid pair.
- Date range where `from > to` → the backend raises `InvalidFilterError`; prevent/validate client-side before issuing the request.
- Empty result set (no transactions, or filters exclude everything) → empty state, Next disabled.
- Last page exactly fills `limit` → Next is enabled but the following page is empty; landing on an empty non-first page shows the empty state ("no transactions yet") rather than a crash.
- Deleting the only row on the current (non-first) page → page would be empty after refetch.
- Amount with decimals / large values → formatting and `gt=0` validation hold; reject `0` and negatives.
- 401 mid-session → handled globally by `api.ts` (redirect to login); no page-specific work needed.
- Rapid filter changes → stale responses shouldn't overwrite newer ones (TanStack Query key hygiene handles this).
- Concurrent edit/delete of a row that was deleted server-side → surface a not-found error without crashing the page.

## Acceptance Criteria
- `/transactions` renders the current user's transactions in a table, most-recent-first by default.
- Filtering by kind, category, and date range updates the list and resets to the first page.
- Category filter/select options reflect the selected kind.
- Pagination Next/Previous work via offset/limit, with Next disabled when the current page isn't full and Previous disabled on the first page.
- Creating a transaction via the modal adds it to the list and reflects in the overview summary.
- Editing a transaction updates the row.
- The kind↔category rule is enforced client-side (invalid pairs can't be submitted) and server 422s are surfaced on the form.
- Deleting requires confirmation and removes the row on success.
- Loading, empty, and error states are handled.
- Lint passes; single quotes in JS/TS, double quotes in JSX.

## Design Decisions
_Resolved from the original open questions._
- **Page size:** fixed `limit = 10` (matches the API default).
- **Category filter when kind = "all":** stays enabled, showing the union of all categories (revised from the original "disabled" decision after manual testing).
- **Sorting scope:** toggle `transaction_date` direction only; `created_at`/`updated_at` ordering is not exposed.
- **Empty page after delete / via Next:** show the empty state with a "no transactions yet" message; do not auto-step back.
- **Modal:** build a minimal reusable `Modal`/`Dialog` primitive in `components/ui/` (overlay + panel, Escape/backdrop close, focus trap, `role="dialog"`), and build the transaction create/edit modal on top of it.
- **Select:** revised from the original native-`<select>` wrapper after mobile testing. Mobile browsers render their own OS-native picker for `<select>` option lists, which page CSS cannot style at all (font size, spacing, etc.) — this made the font-size fix ineffective on real devices. `components/ui/Select.tsx` is now a fully custom ARIA `combobox`/`listbox` component (button trigger + styled option list, keyboard nav, click-outside-to-close) so font size and styling are fully under our control on every platform.

## Open Questions
- None outstanding.

## Testing Guidelines
Create test file(s) under `web/` colocated with the components (Vitest + React Testing Library, matching the existing `*.test.tsx` convention), covering meaningfully — without going too heavy:
- Table renders rows from mocked query data; empty and error states render.
- Filter change issues a request with the expected query params and resets offset to 0.
- Category options change when kind changes (filter and modal).
- Pagination: Next disabled when page not full; Previous disabled on first page; offset advances/retreats correctly.
- Create modal: valid submit calls `POST` with correct payload and invalidates queries; invalid kind↔category pair is blocked by zod validation.
- Edit modal pre-fills and submits a `PATCH`.
- Delete flow requires confirmation and calls `DELETE` on confirm only.
- A zod-schema unit test for the kind↔category rule (valid and invalid pairings).
