import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction, TransactionSummary } from './types'

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('./api', () => ({
  api: { get },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return Wrapper
}

describe('queries', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('useTransactionSummary fetches /transactions/summary', async () => {
    const summary: TransactionSummary = {
      total_income: '100.00',
      total_expense: '50.00',
      net: '50.00',
      by_category: [],
      by_month: [],
    }
    get.mockResolvedValue(summary)
    const { useTransactionSummary } = await import('./queries')

    const { result } = renderHook(() => useTransactionSummary(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.data).toEqual(summary))
    expect(get).toHaveBeenCalledWith('/transactions/summary')
  })

  it('useRecentTransactions defaults to limit=5, sort_dir=desc', async () => {
    const transactions: Transaction[] = []
    get.mockResolvedValue(transactions)
    const { useRecentTransactions } = await import('./queries')

    const { result } = renderHook(() => useRecentTransactions(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.data).toEqual(transactions))
    expect(get).toHaveBeenCalledWith('/transactions/?order_by=transaction_date&sort_dir=desc&limit=5')
  })

  it('useRecentTransactions respects a custom limit', async () => {
    get.mockResolvedValue([])
    const { useRecentTransactions } = await import('./queries')

    const { result } = renderHook(() => useRecentTransactions(3), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith('/transactions/?order_by=transaction_date&sort_dir=desc&limit=3')
  })
})
