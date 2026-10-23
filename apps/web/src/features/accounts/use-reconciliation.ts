import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BalanceHistory,
  BalanceHistoryBody,
  ReconcileBody,
  ReconcilePreview,
  ReconcilePreviewBody,
  ReconcileResult,
} from '@workspace/poco'
import { balanceHistorySchema, reconcilePreviewSchema } from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every account query lives under — a reconciliation moves
 * balances, so its mutation refreshes the whole key. */
const ACCOUNTS_KEY = ['accounts'] as const

/**
 * What the ledger computes for an account on the day the bank's balance was
 * read, and the difference. Runs only once the body is a valid preview — a
 * half-typed balance asks nothing. The answer writes nothing.
 */
export function useReconcilePreview(
  accountId: number,
  body: ReconcilePreviewBody
) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'reconcile-preview', accountId, body],
    queryFn: ({ signal }) =>
      api<ReconcilePreview>(`/reconciliation/${accountId}/preview`, {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
      }),
    enabled: reconcilePreviewSchema.safeParse(body).success,
  })
}

/**
 * Commits a reconciliation: the optional adjustment, the optional Checked
 * marks, and the `reconciledThrough` stamp. It moves balances and statuses,
 * so the accounts and the transactions refresh.
 */
export function useReconcile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      accountId,
      ...body
    }: ReconcileBody & { accountId: number }) =>
      api<ReconcileResult>(`/reconciliation/${accountId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

/** One end-of-day balance per day of the range, for one account. Runs only
 * while the range is valid (a start after the end asks nothing). */
export function useBalanceHistory(
  accountId: number,
  range: BalanceHistoryBody
) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'balance-history', accountId, range],
    queryFn: ({ signal }) =>
      api<BalanceHistory>(`/balances/${accountId}/history`, {
        method: 'POST',
        body: JSON.stringify(range),
        signal,
      }),
    enabled: balanceHistorySchema.safeParse(range).success,
  })
}
