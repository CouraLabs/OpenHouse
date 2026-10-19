import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreditCardStatement,
  PagedResults,
  SearchStatementsArgs,
  Transaction,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/**
 * The credit card bills, shared by the Bills pages, the transaction form's
 * closed-bill notice, and the dashboard cards. A bill's totals derive from
 * its transactions, so every mutation that moves money invalidates this
 * key alongside the transactions.
 */
export const STATEMENTS_KEY = ['statements'] as const

/** A page of the tenant's bills; the args are the query key. */
export function useStatementSearch(
  args: SearchStatementsArgs,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: [...STATEMENTS_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<CreditCardStatement>>('/credit-card-statements/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/** One bill with its totals and status. */
export function useStatement(id: number) {
  return useQuery({
    queryKey: [...STATEMENTS_KEY, 'one', id],
    queryFn: ({ signal }) =>
      api<CreditCardStatement>(`/credit-card-statements/${id}`, { signal }),
  })
}

/** Moves a card charge to another bill of the same card, pinning it. */
export function useMoveToStatement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, statementId }: { id: number; statementId: number }) =>
      api<Transaction>(`/transactions/${id}/statement`, {
        method: 'PATCH',
        body: JSON.stringify({ statementId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}
