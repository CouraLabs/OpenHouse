import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type {
  AccountRef,
  PagedResults,
  SearchTransactionsArgs,
  Transaction,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

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

/** A page of one bill's charges, through the transaction search with the
 * `statementId` filter. Lives under the transactions key, so every
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
