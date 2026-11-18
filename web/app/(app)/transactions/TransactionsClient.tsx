'use client'

import { useState } from 'react'
import { TransactionsSkeleton } from '@/components/ui/Skeleton'
import { useCreateTransaction, useDeleteTransaction, useTransactions, useUpdateTransaction } from '@/lib/queries'
import type { Transaction, TransactionCreatePayload } from '@/lib/types'
import { DeleteTransactionDialog } from './DeleteTransactionDialog'
import { Pagination } from './Pagination'
import { TransactionFilters, type TransactionFiltersValue } from './TransactionFilters'
import { TransactionFormModal } from './TransactionFormModal'
import { TransactionsTable } from './TransactionsTable'

const LIMIT = 10

const DEFAULT_FILTERS: TransactionFiltersValue = { kind: 'all', category: '', dateFrom: '', dateTo: '' }

type FormState = { mode: 'create' | 'edit'; transaction: Transaction | null }

export function TransactionsClient() {
  const [filters, setFilters] = useState<TransactionFiltersValue>(DEFAULT_FILTERS)
  const [offset, setOffset] = useState(0)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [formState, setFormState] = useState<FormState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  const query = useTransactions({
    offset,
    limit: LIMIT,
    order_by: 'transaction_date',
    sort_dir: sortDir,
    kind: filters.kind === 'all' ? undefined : filters.kind,
    category: filters.category || undefined,
    transaction_date_from: filters.dateFrom || undefined,
    transaction_date_to: filters.dateTo || undefined,
  })

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  function handleFiltersChange(next: TransactionFiltersValue) {
    setFilters(next)
    setOffset(0)
  }

  function handleToggleSort() {
    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    setOffset(0)
  }

  async function handleFormSubmit(payload: TransactionCreatePayload) {
    if (formState?.mode === 'edit' && formState.transaction) {
      await updateMutation.mutateAsync({ id: formState.transaction.id, payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (query.isLoading) {
    return <TransactionsSkeleton />
  }

  if (query.isError || !query.data) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-text">
        Couldn&apos;t load your transactions. Try refreshing the page.
      </main>
    )
  }

  const rows = query.data

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <TransactionFilters
        value={filters}
        onChange={handleFiltersChange}
        onAddClick={() => setFormState({ mode: 'create', transaction: null })}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-muted-border bg-surface p-8 text-center text-sm text-muted-text">
          No transactions yet.
        </div>
      ) : (
        <TransactionsTable
          rows={rows}
          sortDir={sortDir}
          onToggleSort={handleToggleSort}
          onEdit={(transaction) => setFormState({ mode: 'edit', transaction })}
          onDelete={(transaction) => setDeleteTarget(transaction)}
        />
      )}

      {(rows.length > 0 || offset > 0) && (
        <Pagination
          offset={offset}
          rowCount={rows.length}
          limit={LIMIT}
          onPrevious={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
          onNext={() => setOffset((prev) => prev + LIMIT)}
        />
      )}

      <TransactionFormModal
        key={formState ? `form-${formState.mode}-${formState.transaction?.id ?? 'new'}` : 'form-closed'}
        isOpen={formState !== null}
        mode={formState?.mode ?? 'create'}
        transaction={formState?.transaction ?? null}
        onClose={() => setFormState(null)}
        onSubmit={handleFormSubmit}
      />

      <DeleteTransactionDialog
        key={deleteTarget ? `delete-open-${deleteTarget.id}` : 'delete-closed'}
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
