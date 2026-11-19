import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction, TransactionListParams, TransactionSummary } from './types'

const { get, post, patch, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

vi.mock('./api', () => ({
  api: { get, post, patch, del },
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
    post.mockReset()
    patch.mockReset()
    del.mockReset()
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

  it('useTransactions builds a query string from params, omitting unset filters', async () => {
    get.mockResolvedValue([])
    const { useTransactions } = await import('./queries')
    const params: TransactionListParams = {
      offset: 0,
      limit: 10,
      order_by: 'transaction_date',
      sort_dir: 'desc',
    }

    const { result } = renderHook(() => useTransactions(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith(
      '/transactions/?offset=0&limit=10&order_by=transaction_date&sort_dir=desc',
    )
  })

  it('useTransactions includes optional filters when set', async () => {
    get.mockResolvedValue([])
    const { useTransactions } = await import('./queries')
    const params: TransactionListParams = {
      offset: 10,
      limit: 10,
      order_by: 'transaction_date',
      sort_dir: 'asc',
      kind: 'expense',
      category: 'groceries',
      transaction_date_from: '2026-01-01',
      transaction_date_to: '2026-02-01',
    }

    const { result } = renderHook(() => useTransactions(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith(
      '/transactions/?offset=10&limit=10&order_by=transaction_date&sort_dir=asc&kind=expense&category=groceries&transaction_date_from=2026-01-01&transaction_date_to=2026-02-01',
    )
  })

  it('useCreateTransaction posts the payload and invalidates transaction queries', async () => {
    const created: Transaction = {
      id: 1,
      user_id: 'u1',
      amount: '50.00',
      kind: 'expense',
      category: 'groceries',
      description: null,
      transaction_date: '2026-03-05T00:00:00Z',
      created_at: '2026-03-05T00:00:00Z',
      updated_at: '2026-03-05T00:00:00Z',
    }
    post.mockResolvedValue(created)
    const { useCreateTransaction } = await import('./queries')

    const { result } = renderHook(() => useCreateTransaction(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({
        amount: '50.00',
        kind: 'expense',
        category: 'groceries',
        description: null,
        transaction_date: '2026-03-05T00:00:00Z',
      })
    })

    expect(post).toHaveBeenCalledWith('/transactions/', {
      amount: '50.00',
      kind: 'expense',
      category: 'groceries',
      description: null,
      transaction_date: '2026-03-05T00:00:00Z',
    })
  })

  it('useUpdateTransaction patches the given id with the payload', async () => {
    patch.mockResolvedValue({})
    const { useUpdateTransaction } = await import('./queries')

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ id: 7, payload: { amount: '60.00' } })
    })

    expect(patch).toHaveBeenCalledWith('/transactions/7', { amount: '60.00' })
  })

  it('useDeleteTransaction deletes the given id', async () => {
    del.mockResolvedValue(undefined)
    const { useDeleteTransaction } = await import('./queries')

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(7)
    })

    expect(del).toHaveBeenCalledWith('/transactions/7')
  })
})
