import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IncomeExpenseTrendChart } from './IncomeExpenseTrendChart'

describe('IncomeExpenseTrendChart', () => {
  it('renders a legend entry for income and expense', () => {
    render(
      <IncomeExpenseTrendChart
        data={[
          { month: '2026-01', income: '1000.00', expense: '400.00' },
          { month: '2026-02', income: '1200.00', expense: '500.00' },
        ]}
      />,
    )
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders a label for each month', () => {
    const { container } = render(
      <IncomeExpenseTrendChart
        data={[
          { month: '2026-01', income: '1000.00', expense: '400.00' },
          { month: '2026-02', income: '1200.00', expense: '500.00' },
        ]}
      />,
    )
    // Scoped to the rendered container — recharts appends a hidden
    // #recharts_measurement_span to document.body for text-width
    // measurement, which can otherwise collide with screen.getByText.
    expect(within(container).getByText('2026-01')).toBeInTheDocument()
    expect(within(container).getByText('2026-02')).toBeInTheDocument()
  })

  it('shows an empty state when there is no data', () => {
    render(<IncomeExpenseTrendChart data={[]} />)
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })
})
