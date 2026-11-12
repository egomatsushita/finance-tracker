import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Transaction, TransactionSummary } from '@/lib/types'
import Home from './page'

const { useTransactionSummaryMock, useRecentTransactionsMock } = vi.hoisted(() => ({
  useTransactionSummaryMock: vi.fn(),
  useRecentTransactionsMock: vi.fn(),
}))

vi.mock('@/lib/queries', () => ({
  useTransactionSummary: useTransactionSummaryMock,
  useRecentTransactions: useRecentTransactionsMock,
}))

vi.mock('@/components/charts/IncomeExpenseTrendChart', () => ({
  IncomeExpenseTrendChart: () => <div data-testid="trend-chart" />,
}))

vi.mock('@/components/charts/CategoryBarChart', () => ({
  CategoryBarChart: () => <div data-testid="category-chart" />,
}))

const summary: TransactionSummary = {
  total_income: '1500.00',
  total_expense: '600.00',
  net: '900.00',
  by_category: [{ kind: 'expense', category: 'groceries', total: '600.00' }],
  by_month: [{ month: '2026-01', income: '1500.00', expense: '600.00' }],
}

const recentTransactions: Transaction[] = [
  {
    id: 1,
    user_id: 'u1',
    amount: '50.00',
    kind: 'expense',
    category: 'groceries',
    description: null,
    transaction_date: '2026-01-10T00:00:00Z',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    user_id: 'u1',
    amount: '1234.00',
    kind: 'income',
    category: 'salary',
    description: null,
    transaction_date: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

describe('Overview page', () => {
  it('shows the skeleton while loading', () => {
    useTransactionSummaryMock.mockReturnValue({ isLoading: true, isError: false, data: undefined })
    useRecentTransactionsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined })

    render(<Home />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.queryByText('Net')).not.toBeInTheDocument()
  })

  it('renders KPI cards, charts, and the recent transactions list when loaded', () => {
    useTransactionSummaryMock.mockReturnValue({ isLoading: false, isError: false, data: summary })
    useRecentTransactionsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: recentTransactions,
    })

    render(<Home />)

    expect(screen.getByText('Net')).toBeInTheDocument()
    expect(screen.getByText('900.00')).toBeInTheDocument()
    expect(screen.getByText('1,500.00')).toBeInTheDocument()
    expect(screen.getByText('+1,234.00')).toBeInTheDocument()
    expect(screen.getAllByText('600.00')).toHaveLength(2)
    expect(screen.getByTestId('trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('category-chart')).toBeInTheDocument()
    expect(screen.getByText('Recent transactions')).toBeInTheDocument()
    expect(screen.getAllByText(/Groceries|Salary/)).toHaveLength(2)
  })

  it('shows empty states when there are no transactions', () => {
    useTransactionSummaryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        total_income: '0.00',
        total_expense: '0.00',
        net: '0.00',
        by_category: [],
        by_month: [],
      },
    })
    useRecentTransactionsMock.mockReturnValue({ isLoading: false, isError: false, data: [] })

    render(<Home />)

    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })

  it('shows exactly as many recent transactions as returned, no padding', () => {
    useTransactionSummaryMock.mockReturnValue({ isLoading: false, isError: false, data: summary })
    useRecentTransactionsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [recentTransactions[0]],
    })

    render(<Home />)

    expect(screen.getAllByText(/Groceries|Salary/)).toHaveLength(1)
  })
})
