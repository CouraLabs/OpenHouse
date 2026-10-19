import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreditCardStatement,
  PagedResults,
  ReconcileStatementBody,
  SearchStatementsArgs,
  StatementBankFiguresBody,
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

/** Moves a card charge to another bill of the same card, pinning it — or
 * re-points the bill a payment settles. */
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

/** Writes the minimum payment and total typed in from the bank's bill. */
export function useUpdateBankFigures() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: StatementBankFiguresBody & { id: number }) =>
      api<CreditCardStatement>(`/credit-card-statements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}

/**
 * Reconciles a bill with the bank's total. The API marks the bill's Verify
 * rows Checked, so the transactions invalidate with the bills; a mismatch
 * answers 409 with the bill's own total (`ReconcileConflict`).
 */
export function useReconcileStatement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: ReconcileStatementBody & { id: number }) =>
      api<CreditCardStatement>(`/credit-card-statements/${id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}
