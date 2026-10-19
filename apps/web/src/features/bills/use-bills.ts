import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  AccountRef,
  CategoryRef,
  PagedResults,
  SearchTransactionsArgs,
  Transaction,
  TransferBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'
import { STATEMENTS_KEY } from '@/lib/statements.js'

/**
 * The Bills pages' own queries; the bills themselves are read through
 * `lib/statements.ts`, shared with the transactions screen.
 */

/** The tenant's ACTIVE accounts — the bills filter offers the cards. */
export function useActiveAccounts() {
  return useQuery({
    queryKey: ['accounts', 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}

/** A page of one bill's charges (`statementId`) or payments
 * (`paymentStatementId`), through the transaction search. Lives under the transactions key, so every
 * transaction mutation refreshes it. */
export function useBillTransactions(args: SearchTransactionsArgs) {
  return useQuery({
    queryKey: ['transactions', 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Transaction>>('/transactions/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** The tenant's ACTIVE categories — the payment form's category pick. */
export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

/**
 * Pays a bill: a transfer into the card naming the bill it settles. It
 * moves two balances, opens the category the first time, and changes the
 * bill's figures, so all four keys invalidate.
 */
export function usePayBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: TransferBody) =>
      api<Transaction[]>('/transactions/transfer', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

/** Marks one row Checked from the reconciliation — a review-status change,
 * which moves no money, so the accounts stay. */
export function useMarkChecked() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<Transaction>(`/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ id, status: 'Checked' }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}
