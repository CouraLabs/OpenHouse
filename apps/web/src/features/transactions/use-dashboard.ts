import { useQuery } from '@tanstack/react-query'
import type { CreditCardStatement, Goal, LimitUsage, PagedResults, TransactionBreakdown, TransactionBreakdownArgs } from '@workspace/dto'

import { api } from '@/lib/api.js'
import { useStatementSearch } from '@/lib/statements.js'

export function useExpenseBreakdown(args: TransactionBreakdownArgs) {
  return useQuery({
    queryKey: ['transactions', 'breakdown', args],
    queryFn: ({ signal }) =>
      api<TransactionBreakdown>('/transactions/breakdown', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
  })
}

export function useLimitUsage() {
  return useQuery({
    queryKey: ['limits', 'usage'],
    queryFn: ({ signal }) => api<LimitUsage[]>('/limits/usage', { signal }),
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals', 'dashboard'],
    queryFn: ({ signal }) =>
      api<PagedResults<Goal>>('/goals/search', {
        method: 'POST',
        body: JSON.stringify({
          sort: [{ field: 'name', dir: 'asc' }],
          filter: {},
          skip: 0,
          limit: 100,
        }),
        signal,
      }),
  })
}

export function useCurrentBills(): CreditCardStatement[] {
  const open = useStatementSearch({
    sort: [{ field: 'closeDate', dir: 'asc' }],
    filter: { status: ['Open'] },
    skip: 0,
    limit: 100,
  })

  return firstPerCard(open.data?.items ?? [])
}

export function useNextDueBills(): CreditCardStatement[] {
  const unpaid = useStatementSearch({
    sort: [{ field: 'closeDate', dir: 'desc' }],
    filter: { status: ['Closed', 'PartiallyPaid', 'Overdue'] },
    skip: 0,
    limit: 100,
  })

  return firstPerCard(unpaid.data?.items ?? [])
}

function firstPerCard(bills: CreditCardStatement[]): CreditCardStatement[] {
  const seen = new Set<number>()

  return bills.filter((bill) => {
    if (seen.has(bill.accountId)) {
      return false
    }

    seen.add(bill.accountId)

    return true
  })
}
