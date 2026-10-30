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

export const STATEMENTS_KEY = ['statements'] as const

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

export function useStatement(id: number) {
  return useQuery({
    queryKey: [...STATEMENTS_KEY, 'one', id],
    queryFn: ({ signal }) =>
      api<CreditCardStatement>(`/credit-card-statements/${id}`, { signal }),
  })
}

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
