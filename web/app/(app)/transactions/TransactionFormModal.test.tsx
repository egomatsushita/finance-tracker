import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import type { Transaction } from '@/lib/types'
import { TransactionFormModal } from './TransactionFormModal'

async function chooseOption(user: UserEvent, labelText: string, optionName: string) {
  await user.click(screen.getByLabelText(labelText))
  await user.click(screen.getByRole('option', { name: optionName }))
}

const existing: Transaction = {
  id: 1,
  user_id: 'u1',
  amount: '50.00',
  kind: 'expense',
  category: 'groceries',
  description: 'Weekly shop',
  transaction_date: '2026-03-05T00:00:00Z',
  created_at: '2026-03-05T00:00:00Z',
  updated_at: '2026-03-05T00:00:00Z',
}

describe('TransactionFormModal', () => {
  it('renders nothing when closed', () => {
    render(
      <TransactionFormModal isOpen={false} mode="create" transaction={null} onClose={vi.fn()} onSubmit={vi.fn()} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits a valid create payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <TransactionFormModal isOpen mode="create" transaction={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText('Amount'), '25.50')
    await chooseOption(user, 'Kind', 'Expense')
    await chooseOption(user, 'Category', 'Groceries')
    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    await user.clear(dateInput)
    await user.type(dateInput, '2026-03-05')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        amount: '25.50',
        kind: 'expense',
        category: 'groceries',
        description: null,
        transaction_date: '2026-03-05',
      }),
    )
  })

  it('clears an incompatible category when kind changes, blocking submission until reselected', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <TransactionFormModal isOpen mode="create" transaction={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText('Amount'), '25.50')
    await chooseOption(user, 'Kind', 'Expense')
    await chooseOption(user, 'Category', 'Groceries')
    // Switching to a kind that doesn't offer "groceries" must clear the now-invalid category.
    await chooseOption(user, 'Kind', 'Income')
    await user.click(screen.getByLabelText('Category'))
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    await user.clear(dateInput)
    await user.type(dateInput, '2026-03-05')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/invalid option/i)).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('pre-fills fields in edit mode', () => {
    render(
      <TransactionFormModal isOpen mode="edit" transaction={existing} onClose={vi.fn()} onSubmit={vi.fn()} />,
    )
    expect(screen.getByLabelText('Amount')).toHaveValue('50.00')
    expect(screen.getByLabelText('Description')).toHaveValue('Weekly shop')
  })

  it('maps a server validation error onto the matching field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(422, {
          detail: [{ loc: ['body', 'category'], msg: 'invalid category', type: 'value_error' }],
        }),
      )
    render(
      <TransactionFormModal isOpen mode="create" transaction={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText('Amount'), '25.50')
    await chooseOption(user, 'Kind', 'Expense')
    await chooseOption(user, 'Category', 'Groceries')
    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    await user.clear(dateInput)
    await user.type(dateInput, '2026-03-05')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText('invalid category')).toBeInTheDocument())
  })
})
