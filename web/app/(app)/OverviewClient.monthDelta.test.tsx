import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Transaction, TransactionSummary } from '@/lib/types'
import { OverviewClient } from './OverviewClient'

// The KPI tiles should describe the most recent month with activity and compare
// it against the previous month that had activity — naming that month rather
// than claiming "last month". by_month has no gap-fill, so the previous element
// can be several calendar months back; the label must not imply adjacency.
//
// Data mirrors the seed account: the only populated months are 2026-03 and
// 2026-11 (eight months apart).

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
  total_income: '10950.00',
  total_expense: '6840.00',
  net: '4110.00',
  by_category: [{ kind: 'expense', category: 'housing', total: '3450.00' }],
  by_month: [
    { month: '2026-03', income: '3350.00', expense: '2275.00' },
    { month: '2026-11', income: '1200.00', expense: '100.00' },
  ],
}

const recentTransactions: Transaction[] = [
  {
    id: 1,
    user_id: 'u1',
    amount: '1200.00',
    kind: 'income',
    category: 'rental',
    description: null,
    transaction_date: '2026-11-10T00:00:00Z',
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
  },
]

function renderLoaded() {
  useTransactionSummaryMock.mockReturnValue({ isLoading: false, isError: false, data: summary })
  useRecentTransactionsMock.mockReturnValue({
    isLoading: false,
    isError: false,
    data: recentTransactions,
  })
  render(<OverviewClient />)
}

describe('OverviewClient — KPI current month vs previous active month', () => {
  it('shows the latest month figures, not the all-time totals', () => {
    renderLoaded()

    // Net headline is November's net (1,200 − 100 = 1,100), not the all-time
    // net of 4,110.
    expect(screen.getByText('1,100.00')).toBeInTheDocument()
    // The all-time income total must not appear in the KPI tiles.
    expect(screen.queryByText('10,950.00')).not.toBeInTheDocument()
    // The period being summarized is labelled.
    expect(screen.getByText('Nov 2026')).toBeInTheDocument()
  })

  it('labels the delta with the actual previous active month, never "last month"', () => {
    renderLoaded()

    // income: (1200 - 3350) / 3350 = -64.2%
    expect(screen.getByText('-64.2% vs Mar 2026')).toBeInTheDocument()
    // expense: (100 - 2275) / 2275 = -95.6%
    expect(screen.getByText('-95.6% vs Mar 2026')).toBeInTheDocument()
    // net: (1100 - 1075) / 1075 = +2.3%
    expect(screen.getByText('+2.3% vs Mar 2026')).toBeInTheDocument()

    expect(screen.queryByText(/vs last month/i)).not.toBeInTheDocument()
  })
})
