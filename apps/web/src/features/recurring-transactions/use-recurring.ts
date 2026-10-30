import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  AccountRef,
  CategoryRef,
  CreateRecurringTransactionBody,
  PagedResults,
  ReceiverRef,
  RecurringTransaction,
  SearchRecurringTransactionsArgs,
  UpdateRecurringTransactionBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

const RECURRING_KEY = ['recurring-transactions'] as const

export function useRecurringSearch(args: SearchRecurringTransactionsArgs) {
  return useQuery({
    queryKey: [...RECURRING_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<RecurringTransaction>>(
        '/recurring-transactions/search',
        {
          method: 'POST',
          body: JSON.stringify(args),
          signal,
        }
      ),
    placeholderData: keepPreviousData,
  })
}

export function useSaveRecurring() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      body: CreateRecurringTransactionBody | UpdateRecurringTransactionBody
    ) =>
      'id' in body
        ? api<RecurringTransaction>('/recurring-transactions', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<RecurringTransaction>('/recurring-transactions', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY })
    },
  })
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/recurring-transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY })
    },
  })
}

export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}

export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

export function useActiveAccounts() {
  return useQuery({
    queryKey: ['accounts', 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}
