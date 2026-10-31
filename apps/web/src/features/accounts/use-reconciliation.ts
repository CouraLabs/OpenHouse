import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BalanceHistory,
  BalanceHistoryBody,
  ReconcileBody,
  ReconcilePreview,
  ReconcilePreviewBody,
  ReconcileResult,
} from '@workspace/dto'
import { balanceHistorySchema, reconcilePreviewSchema } from '@workspace/dto'

import { api } from '@/lib/api.js'

const ACCOUNTS_KEY = ['accounts'] as const

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
