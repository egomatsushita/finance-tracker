import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CategoryBarChart } from './CategoryBarChart'

describe('CategoryBarChart', () => {
  it('renders a label for each expense category, excluding income categories', () => {
    const { container } = render(
      <CategoryBarChart
        data={[
          { kind: 'expense', category: 'groceries', total: '50.00' },
          { kind: 'expense', category: 'housing', total: '200.00' },
          { kind: 'income', category: 'salary', total: '1000.00' },
        ]}
      />,
    )
    expect(within(container).getByText('Housing')).toBeInTheDocument()
    expect(within(container).getByText('Groceries')).toBeInTheDocument()
    expect(within(container).queryByText('Salary')).not.toBeInTheDocument()
  })

  it('orders bars by total descending', () => {
    const { container } = render(
      <CategoryBarChart
        data={[
          { kind: 'expense', category: 'groceries', total: '50.00' },
          { kind: 'expense', category: 'housing', total: '200.00' },
          { kind: 'expense', category: 'transport', total: '120.00' },
        ]}
      />,
    )
    const tickLabels = Array.from(
      container.querySelectorAll('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value'),
    ).map((el) => el.textContent)
    expect(tickLabels).toEqual(['Housing', 'Transport', 'Groceries'])
  })

  it('shows an empty state when there are no expense categories', () => {
    render(<CategoryBarChart data={[{ kind: 'income', category: 'salary', total: '1000.00' }]} />)
    expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument()
  })

  it('shows an empty state when data is empty', () => {
    render(<CategoryBarChart data={[]} />)
    expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument()
  })
})
