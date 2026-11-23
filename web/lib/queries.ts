import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  ProfileUpdatePayload,
  Transaction,
  TransactionCreatePayload,
  TransactionListParams,
  TransactionSummary,
  TransactionUpdatePayload,
  User,
} from './types'

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

function buildTransactionListQuery(params: TransactionListParams): string {
  const search = new URLSearchParams()
  search.set('offset', String(params.offset))
  search.set('limit', String(params.limit))
  search.set('order_by', params.order_by)
  search.set('sort_dir', params.sort_dir)
  if (params.kind) search.set('kind', params.kind)
  if (params.category) search.set('category', params.category)
  if (params.transaction_date_from) search.set('transaction_date_from', params.transaction_date_from)
  if (params.transaction_date_to) search.set('transaction_date_to', params.transaction_date_to)
  return search.toString()
}

export function useTransactions(params: TransactionListParams) {
  return useQuery({
    queryKey: ['transactions', 'list', params],
    queryFn: () => api.get<Transaction[]>(`/transactions/?${buildTransactionListQuery(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TransactionCreatePayload) =>
      api.post<Transaction>('/transactions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TransactionUpdatePayload }) =>
      api.patch<Transaction>(`/transactions/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del<void>(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProfileUpdatePayload }) =>
      api.put<User>(`/users/${id}`, payload),
  })
}
