import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  AccountRef,
  CategoryRef,
  CreateTransactionBody,
  PagedResults,
  ReceiverRef,
  SearchTransactionsArgs,
  Transaction,
  TransactionSummary,
  TransferBody,
  UpdateTransactionBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every transaction query and mutation lives under. */
const TRANSACTIONS_KEY = ['transactions'] as const

/** The key the account list lives under — transfers change balances, so
 * mutations invalidate it too. */
const ACCOUNTS_KEY = ['accounts'] as const

/**
 * The pages of transactions a search describes, loaded lazily as the grid
 * scrolls. The args minus the paging are the query key; each page is its
 * own cache entry.
 */
export function useTransactionsInfinite(args: SearchTransactionsArgs) {
  return useInfiniteQuery({
    queryKey: [...TRANSACTIONS_KEY, 'search', args],
    queryFn: ({ pageParam, signal }) =>
      api<PagedResults<Transaction>>('/transactions/search', {
        method: 'POST',
        body: JSON.stringify({ ...args, skip: pageParam }),
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, allPages) => {
      // A page that answers nothing means the offset walked past rows that
      // vanished while paging — asking again would answer nothing again,
      // forever. Paging stops here; the next mutation's invalidation
      // refetches from the first page.
      if (last.items.length === 0) {
        return undefined
      }

      const loaded = allPages.reduce((total, page) => total + page.items.length, 0)

      return loaded < last.total ? loaded : undefined
    },
    placeholderData: keepPreviousData,
  })
}

/** Totals the transactions a filter describes, grouped by currency. */
export function useTransactionSummary(filter: SearchTransactionsArgs['filter']) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'summary', filter],
    queryFn: ({ signal }) =>
      api<TransactionSummary>('/transactions/summary', {
        method: 'POST',
        body: JSON.stringify({ sort: [], filter }),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** Saves a transaction: creates when the body has no id, updates when it
 * has. A save moves the account's balance, so the accounts invalidate too. */
export function useSaveTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTransactionBody | UpdateTransactionBody) =>
      'id' in body
        ? api<Transaction>('/transactions', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

/** Soft-deletes a transaction: the API reverts the account's balance. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

/** Moves money between two accounts: the API creates the two sides. */
export function useTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: TransferBody) =>
      api<Transaction[]>('/transactions/transfer', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

/** The tenant's ACTIVE accounts, with type and currency — what the forms'
 * dropdowns and the transfer's currency check read. */
export function useActiveAccounts() {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}

/** The tenant's ACTIVE categories, by name — what the forms' dropdowns offer. */
export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

/** The tenant's ACTIVE receivers, by name — what the forms' dropdowns offer. */
export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}
