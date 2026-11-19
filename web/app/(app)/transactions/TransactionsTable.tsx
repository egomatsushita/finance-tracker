import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { getCategoryIcon } from '@/lib/categoryIcons'
import { formatCategoryLabel, formatDate, formatMoney } from '@/lib/format'
import type { Transaction } from '@/lib/types'

type TransactionsTableProps = {
  rows: Transaction[]
  sortDir: 'asc' | 'desc'
  onToggleSort: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

export function TransactionsTable({ rows, sortDir, onToggleSort, onEdit, onDelete }: TransactionsTableProps) {
  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown

  return (
    <div className="overflow-x-auto rounded-2xl border border-muted-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-muted-border text-muted-text">
            <th className="px-4 py-3 font-medium">
              <button
                type="button"
                onClick={onToggleSort}
                className="inline-flex cursor-pointer items-center gap-1 font-medium text-muted-text"
              >
                Date
                <SortIcon size={14} aria-hidden="true" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-muted-border">
          {rows.map((row) => {
            const Icon = getCategoryIcon(row.category)
            return (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3 text-ink">{formatDate(row.transaction_date)}</td>
                <td className="px-4 py-3 text-ink">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted-border/60">
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    {formatCategoryLabel(row.category)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-text">{row.description ?? '—'}</td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-mono ${row.kind === 'income' ? 'text-income' : 'text-expense'}`}
                >
                  {row.kind === 'income' ? '+' : '−'}
                  {formatMoney(row.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      aria-label={`Edit transaction from ${formatDate(row.transaction_date)}`}
                      className="cursor-pointer text-muted-text hover:text-ink"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      aria-label={`Delete transaction from ${formatDate(row.transaction_date)}`}
                      className="cursor-pointer text-muted-text hover:text-expense"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
