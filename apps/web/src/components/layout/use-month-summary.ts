import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TransactionSummary } from '@workspace/dto'

import { api } from '@/lib/api.js'
import { useTenantToday } from '@/lib/settings.js'
import { monthWindow } from './month-window.js'

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
