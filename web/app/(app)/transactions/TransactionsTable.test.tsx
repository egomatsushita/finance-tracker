import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/lib/types'
import { TransactionsTable } from './TransactionsTable'

const rows: Transaction[] = [
  {
    id: 1,
    user_id: 'u1',
    amount: '50.00',
    kind: 'expense',
    category: 'groceries',
    description: 'Weekly shop',
    transaction_date: '2026-03-05T00:00:00Z',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
  },
  {
    id: 2,
    user_id: 'u1',
    amount: '1000.00',
    kind: 'income',
    category: 'salary',
    description: null,
    transaction_date: '2026-03-01T00:00:00Z',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
]

describe('TransactionsTable', () => {
  it('renders a row per transaction with formatted category and amount', () => {
    render(
      <TransactionsTable
        rows={rows}
        sortDir="desc"
        onToggleSort={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText(/50\.00/)).toBeInTheDocument()
    expect(screen.getByText(/1,000\.00/)).toBeInTheDocument()
  })

  it('toggles sort direction when the date header is clicked', async () => {
    const onToggleSort = vi.fn()
    render(
      <TransactionsTable
        rows={rows}
        sortDir="desc"
        onToggleSort={onToggleSort}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    screen.getByRole('button', { name: /date/i }).click()
    expect(onToggleSort).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit and onDelete with the row when actions are clicked', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <TransactionsTable rows={rows} sortDir="desc" onToggleSort={vi.fn()} onEdit={onEdit} onDelete={onDelete} />,
    )
    screen.getAllByRole('button', { name: /edit/i })[0].click()
    expect(onEdit).toHaveBeenCalledWith(rows[0])

    screen.getAllByRole('button', { name: /delete/i })[0].click()
    expect(onDelete).toHaveBeenCalledWith(rows[0])
  })
})
