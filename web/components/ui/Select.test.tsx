import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

describe('Select', () => {
  it('associates the label with the trigger and shows the selected option', () => {
    render(<Select label="Kind" options={options} value="income" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Kind')).toHaveTextContent('Income')
  })

  it('opens the listbox and lists all options on click', async () => {
    const user = userEvent.setup()
    render(<Select label="Kind" options={options} value="income" onChange={vi.fn()} />)

    await user.click(screen.getByLabelText('Kind'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Income' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Expense' })).toBeInTheDocument()
  })

  it('calls onChange with the clicked option value and closes the listbox', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select label="Kind" options={options} value="income" onChange={onChange} />)

    await user.click(screen.getByLabelText('Kind'))
    await user.click(screen.getByRole('option', { name: 'Expense' }))

    expect(onChange).toHaveBeenCalledWith('expense')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports keyboard navigation and selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select label="Kind" options={options} value="income" onChange={onChange} />)

    const trigger = screen.getByLabelText('Kind')
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith('expense')
  })

  it('closes on Escape without calling onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select label="Kind" options={options} value="income" onChange={onChange} />)

    await user.click(screen.getByLabelText('Kind'))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders an error message when passed one', () => {
    render(<Select label="Kind" options={options} value="income" onChange={vi.fn()} error="Kind is required" />)
    expect(screen.getByText('Kind is required')).toBeInTheDocument()
  })

  it('forwards a ref to the trigger button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Select label="Kind" options={options} value="income" onChange={vi.fn()} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('does not open when disabled', async () => {
    const user = userEvent.setup()
    render(<Select label="Category" options={options} value="income" onChange={vi.fn()} disabled />)
    expect(screen.getByLabelText('Category')).toBeDisabled()
    await user.click(screen.getByLabelText('Category'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
