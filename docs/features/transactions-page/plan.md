# FT-39 — Transactions Page Implementation Plan

## Context

The `/transactions` nav link already exists (`components/nav/navItems.ts`) but routes to nothing. This builds the authenticated Transactions page: a filterable, paginated table of the current user's transactions with full CRUD (create/edit modal, delete-with-confirm). The backend API (`GET/POST/PATCH/DELETE /transactions/`) is complete and unchanged — this is **frontend-only** work in `web/`.

Spec: `_specs/transactions-page.md`. All design questions are resolved there (page size 10, category filter disabled when kind=all, `transaction_date`-only sorting, empty-state on empty pages, new `Modal` primitive, native-`<select>`-based `Select` primitive).

Follows the established pattern: a server `page.tsx` renders a `'use client'` orchestrator (like `app/(app)/page.tsx` → `OverviewClient.tsx`), fetching/mutating via TanStack Query hooks in `lib/queries.ts` through the `api` client (`lib/api.ts`, which auto-attaches CSRF on non-GET). Frontend TDD: Vitest + RTL, colocated `*.test.tsx`.

## Shared foundations

### `lib/types.ts` — add payload types
Add alongside existing `Transaction`:
- `TransactionCreatePayload` = `{ amount: string; kind: TransactionKind; category: TransactionCategory; description: string | null; transaction_date: string }`
- `TransactionUpdatePayload` = `Partial<TransactionCreatePayload>`
- `TransactionListParams` = `{ offset: number; limit: number; order_by: 'transaction_date'; sort_dir: 'asc' | 'desc'; kind?: TransactionKind; category?: TransactionCategory; transaction_date_from?: string; transaction_date_to?: string }`

### `lib/transactionCategories.ts` — new, single source of truth for the kind↔category rule
Mirror the backend `_VALID_CATEGORIES` (`app/schemas/transaction.py`):
- `INCOME_CATEGORIES: readonly IncomeCategory[]` and `EXPENSE_CATEGORIES: readonly ExpenseCategory[]`
- `CATEGORIES_BY_KIND: Record<TransactionKind, readonly TransactionCategory[]>`
- `transactionFormSchema` (zod): `amount` (string, refine → `Number(v) > 0`), `kind` enum, `category` enum, `description` (string, max 255, optional), `transaction_date` (non-empty string). A `.superRefine` enforces `category ∈ CATEGORIES_BY_KIND[kind]`, attaching the error to the `category` path. Export `TransactionFormValues = z.infer<...>`.

This keeps the rule in one place, reused by the form resolver and unit-tested directly.

### `lib/format.ts` — add `formatDate`
Add `formatDate(iso: string): string` via `Intl.DateTimeFormat('en-US', { year, month, day })` for the table's date column. Keep existing `formatMoney` / `formatCategoryLabel`.

## Data layer — `lib/queries.ts`

- `useTransactions(params: TransactionListParams)`: builds a query string with `URLSearchParams`, omitting `undefined`/empty values; `queryKey: ['transactions', 'list', params]` (params object in the key keeps cache entries distinct and gives stale-response hygiene for free); `placeholderData: keepPreviousData` so pagination/filter changes don't flash the skeleton.
- `useCreateTransaction()` / `useUpdateTransaction()` / `useDeleteTransaction()`: `useMutation` calling `api.post('/transactions/', payload)`, `api.patch(\`/transactions/${id}\`, payload)`, `api.del(\`/transactions/${id}\`)`. Each `onSuccess` calls `queryClient.invalidateQueries({ queryKey: ['transactions'] })` — the shared prefix also refreshes the Overview summary/recent queries, satisfying the "reflects in overview" criterion.

Reuse the existing `api` object and `ApiError`; no changes to `lib/api.ts`.

## UI primitives — `components/ui/`

### `Modal.tsx` (new)
Minimal accessible dialog mirroring the `Input`/`Button` house style: fixed overlay + centered panel (`bg-surface`, rounded, `border-muted-border`), `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Close on Escape (keydown listener) and backdrop click; initial focus to the panel, restore focus to the trigger on close; lock body scroll while open. Props: `{ isOpen, onClose, title, children }`. Keep it dependency-free.

### `Select.tsx` (new)
Thin wrapper around a native `<select>`, structurally identical to `Input.tsx` (label + error slot + `aria-invalid`/`aria-describedby`, same border/focus classes). Props extend `SelectHTMLAttributes<HTMLSelectElement>` with `label`, `error?`, `options: { value: string; label: string }[]`, `ref`. Native keeps keyboard/mobile/a11y for free (per resolved decision).

## Feature components — `app/(app)/transactions/`

- **`page.tsx`** (server): `export const instant = false`; renders `<TransactionsClient />`. Mirrors `app/(app)/page.tsx`.
- **`TransactionsClient.tsx`** (`'use client'`): owns state — filters (`kind`, `category`, `date_from`, `date_to`), `offset`, `sortDir`, modal state (`{ mode: 'create' | 'edit', transaction? }`), and the pending delete row. Calls `useTransactions(params)`. Renders filters, table, pagination, and conditionally the form modal + delete dialog. Handles loading (`TransactionsSkeleton`), error (same copy as `OverviewClient`), and empty states ("No transactions yet…"). Changing any filter resets `offset` to 0.
- **`TransactionFilters.tsx`**: `Select` for kind (All/Income/Expense), `Select` for category (options from `CATEGORIES_BY_KIND[kind]`, **disabled when kind = All**), two date `Input`s. Validates `from ≤ to` client-side before propagating (block the request and show an inline message when `from > to`, matching the backend `InvalidFilterError` guard). "Add transaction" button opens the create modal.
- **`TransactionsTable.tsx`**: columns date / kind / category (icon via `getCategoryIcon` + `formatCategoryLabel`) / description / amount (`formatMoney`, income/expense tone) / actions (edit, delete buttons). The `transaction_date` header toggles `sortDir`. Reuses tones/classes seen in `OverviewClient`.
- **`Pagination.tsx`** (or inline in client): Prev disabled when `offset === 0`; Next disabled when `rows.length < limit` (page-fullness); steps `offset` by `limit` (10).
- **`TransactionFormModal.tsx`**: `Modal` + RHF form using `zodResolver(transactionFormSchema)` (pattern from `app/signup/page.tsx`). Fields via `Input`/`Select`. Watching `kind` resets/revalidates `category` when it leaves the valid set. Edit mode pre-fills via `reset(...)` (slice `transaction_date` to `YYYY-MM-DD` for the date input). Submit builds the payload (date → ISO, e.g. `\`${date}T00:00:00Z\``) and calls the create/update mutation; on success invalidate + close. Map server 422 (`ApiError` with `ValidationErrorDetail[]`) onto form fields / a form-level error, like signup's `catch`.
- **`DeleteTransactionDialog.tsx`**: `Modal`-based confirm ("Delete this transaction?" + Cancel/Delete). Calls `useDeleteTransaction` only on confirm; invalidate on success.

Add a `TransactionsSkeleton` to `components/ui/Skeleton.tsx` (sibling of `OverviewSkeleton`) for the table loading state.

## Tests (Vitest + RTL, colocated)

- `lib/transactionCategories.test.ts`: zod schema accepts valid kind↔category pairs, rejects invalid ones (e.g. income+groceries), amount ≤ 0, over-long description.
- `lib/queries.test.tsx` (extend existing): `useTransactions` issues the expected query string from params; create/update/delete mutations hit the right method/path and invalidate `['transactions']`.
- `TransactionsTable.test.tsx`: renders rows from mock data; sort header toggles direction.
- `TransactionFilters.test.tsx`: category options change with kind; category disabled when kind=All; filter change resets offset (asserted via client); `from > to` blocked.
- `Pagination` (within client test): Next disabled when page not full; Prev disabled on first page; offset advances/retreats.
- `TransactionFormModal.test.tsx`: valid create calls POST with correct payload; invalid kind↔category blocked by validation; edit pre-fills and submits PATCH.
- `DeleteTransactionDialog.test.tsx`: DELETE only fires after confirm.
- Empty/error states render.

## Verification

1. `cd web && npm test` — all new + existing suites pass.
2. `cd web && npm run lint` — clean (single quotes JS/TS, double quotes JSX).
3. Manual (dev session, per "let user test manually"): run backend (`uv run app/main.py`) + `cd web && npm run dev`, log in as the seeded member, visit `/transactions`. Verify: table lists seeded rows newest-first; kind/category/date filters + sort work and reset paging; Next/Prev gate correctly at 10/page; create/edit modal validates the kind↔category rule and persists; Overview KPIs update after a create; delete asks for confirmation and removes the row.

## Out of scope
- No backend changes. No total-count endpoint (pagination stays page-fullness based). No custom listbox/combobox. No bulk actions.
