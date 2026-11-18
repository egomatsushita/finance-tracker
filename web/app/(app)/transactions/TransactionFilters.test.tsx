import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionFilters, type TransactionFiltersValue } from './TransactionFilters'

const baseValue: TransactionFiltersValue = {
  kind: 'all',
  category: '',
  dateFrom: '',
  dateTo: '',
}

describe('TransactionFilters', () => {
  it('keeps the category select enabled and shows the union of all categories when kind is "all"', async () => {
    const user = userEvent.setup()
    render(<TransactionFilters value={baseValue} onChange={vi.fn()} onAddClick={vi.fn()} />)
    expect(screen.getByLabelText('Category')).toBeEnabled()
    await user.click(screen.getByLabelText('Category'))
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument()
  })

  it('shows only kind-specific options once a kind is chosen', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TransactionFilters
        value={{ ...baseValue, kind: 'expense' }}
        onChange={onChange}
        onAddClick={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Category')).toBeEnabled()
    await user.click(screen.getByLabelText('Category'))
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument()
  })

  it('calls onChange with the kind reset to "all" category when kind changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TransactionFilters
        value={{ ...baseValue, kind: 'expense', category: 'groceries' }}
        onChange={onChange}
        onAddClick={vi.fn()}
      />,
    )
    await user.click(screen.getByLabelText('Kind'))
    await user.click(screen.getByRole('option', { name: 'Income' }))
    expect(onChange).toHaveBeenCalledWith({
      kind: 'income',
      category: '',
      dateFrom: '',
      dateTo: '',
    })
  })

  it('propagates a valid date range', () => {
    const onChange = vi.fn()
    render(<TransactionFilters value={baseValue} onChange={onChange} onAddClick={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })
    expect(onChange).toHaveBeenCalledWith({ ...baseValue, dateFrom: '2026-01-01' })
  })

  it('shows an error and withholds onChange when "from" is after "to"', () => {
    const onChange = vi.fn()
    render(
      <TransactionFilters
        value={{ ...baseValue, dateTo: '2026-01-01' }}
        onChange={onChange}
        onAddClick={vi.fn()}
      />,
    )
    onChange.mockClear()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } })
    expect(screen.getByText(/must be before/i)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onAddClick when the add button is clicked', () => {
    const onAddClick = vi.fn()
    render(<TransactionFilters value={baseValue} onChange={vi.fn()} onAddClick={onAddClick} />)
    screen.getByRole('button', { name: /add transaction/i }).click()
    expect(onAddClick).toHaveBeenCalledTimes(1)
  })
})
