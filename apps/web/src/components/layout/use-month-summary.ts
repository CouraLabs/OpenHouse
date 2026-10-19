import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TransactionSummary } from '@workspace/poco'

import { api } from '@/lib/api.js'
import { useTenantToday } from '@/lib/settings.js'
import { monthWindow } from './month-window.js'

/**
 * This month's income and expense totals, per currency, in the tenant's
 * calendar. The key sits under `transactions`, so every transaction write
 * that invalidates the transactions refreshes it too.
 */
export function useMonthSummary() {
  const { from, to } = monthWindow(useTenantToday())
  const filter = { transactionDtFrom: from, transactionDtTo: to }

  return useQuery({
    queryKey: ['transactions', 'summary', filter],
    queryFn: ({ signal }) =>
      api<TransactionSummary>('/transactions/summary', {
        method: 'POST',
        body: JSON.stringify({ sort: [], filter }),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}
