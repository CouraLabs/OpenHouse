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

/** The key every recurring-rule query and mutation lives under. */
const RECURRING_KEY = ['recurring-transactions'] as const

/**
 * The page of rules a search describes. The args are the query key — every
 * distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
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

/** Saves a rule: creates when the body has no id, updates when it has. */
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

/** Soft-deletes a rule: the API marks it DELETED. */
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

/** The tenant's ACTIVE receivers, by name — what the form's dropdown offers. */
export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}

/** The tenant's ACTIVE categories, by name — what the form's dropdown offers. */
export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

/** The tenant's ACTIVE accounts, by name — what the form's dropdown offers. */
export function useActiveAccounts() {
  return useQuery({
    queryKey: ['accounts', 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}
