import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/lib/types'
import { TransactionsClient } from './TransactionsClient'

async function chooseOption(user: UserEvent, scope: HTMLElement, labelText: string, optionName: string) {
  await user.click(within(scope).getByLabelText(labelText))
  await user.click(screen.getByRole('option', { name: optionName }))
}

const { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, mutateAsync } = vi.hoisted(
  () => ({
    useTransactions: vi.fn(),
    useCreateTransaction: vi.fn(),
    useUpdateTransaction: vi.fn(),
    useDeleteTransaction: vi.fn(),
    mutateAsync: vi.fn(),
  }),
)

vi.mock('@/lib/queries', () => ({
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
}))

const rows: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  user_id: 'u1',
  amount: '10.00',
  kind: 'expense',
  category: 'groceries',
  description: null,
  transaction_date: '2026-03-05T00:00:00Z',
  created_at: '2026-03-05T00:00:00Z',
  updated_at: '2026-03-05T00:00:00Z',
}))

describe('TransactionsClient', () => {
  beforeEach(() => {
    useTransactions.mockReset()
    useCreateTransaction.mockReset().mockReturnValue({ mutateAsync })
    useUpdateTransaction.mockReset().mockReturnValue({ mutateAsync })
    useDeleteTransaction.mockReset().mockReturnValue({ mutateAsync })
    mutateAsync.mockReset().mockResolvedValue(undefined)
  })

  it('shows a loading skeleton while the list is loading', () => {
    useTransactions.mockReturnValue({ isLoading: true, isError: false, data: undefined })
    render(<TransactionsClient />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error message when the query fails', () => {
    useTransactions.mockReturnValue({ isLoading: false, isError: true, data: undefined })
    render(<TransactionsClient />)
    expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no transactions', () => {
    useTransactions.mockReturnValue({ isLoading: false, isError: false, data: [] })
    render(<TransactionsClient />)
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })

  it('renders the table when transactions are returned', () => {
    useTransactions.mockReturnValue({ isLoading: false, isError: false, data: rows })
    render(<TransactionsClient />)
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0)
  })

  it('resets offset to 0 when a filter changes', async () => {
    const user = userEvent.setup()
    useTransactions.mockReturnValue({ isLoading: false, isError: false, data: rows })
    render(<TransactionsClient />)

    // Page is full (10 rows), so Next is enabled; advance a page first.
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(useTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 }))

    await chooseOption(user, document.body, 'Kind', 'Income')
    expect(useTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, kind: 'income' }))
  })

  it('opens the create modal from the filters bar and submits via the create mutation', async () => {
    const user = userEvent.setup()
    useTransactions.mockReturnValue({ isLoading: false, isError: false, data: rows })
    render(<TransactionsClient />)

    await user.click(screen.getByRole('button', { name: /add transaction/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText('Amount'), '15.00')
    await chooseOption(user, dialog, 'Kind', 'Expense')
    await chooseOption(user, dialog, 'Category', 'Groceries')
    const dateInput = within(dialog).getByLabelText('Date') as HTMLInputElement
    await user.clear(dateInput)
    await user.type(dateInput, '2026-03-05')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
  })

  it('deletes a transaction only after the confirm dialog is accepted', async () => {
    const user = userEvent.setup()
    useTransactions.mockReturnValue({ isLoading: false, isError: false, data: rows })
    render(<TransactionsClient />)

    await user.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(mutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(1))
  })
})
