import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { Transaction, TransactionSummary } from './types'

export function useTransactionSummary() {
  return useQuery({
    queryKey: ['transactions', 'summary'],
    queryFn: () => api.get<TransactionSummary>('/transactions/summary'),
  })
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: () =>
      api.get<Transaction[]>(`/transactions/?order_by=transaction_date&sort_dir=desc&limit=${limit}`),
  })
}
