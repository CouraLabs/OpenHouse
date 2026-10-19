import { useQuery } from '@tanstack/react-query'
import type {
  CreditCardStatement,
  Goal,
  LimitUsage,
  PagedResults,
  RecurringTransaction,
  TransactionBreakdown,
  TransactionBreakdownArgs,
} from '@workspace/poco'

import { api } from '@/lib/api.js'
import { useStatementSearch } from '@/lib/statements.js'

/**
 * The dashboard queries the transaction screen's cards read: the expense
 * breakdowns, the goal and limit gauges, and the recurring rules the next
 * month's expectation projects. Each key mirrors the feature the rows
 * belong to, so a mutation there invalidates the card here too.
 */

/** Totals the tenant's expenses over a filter, grouped by a dimension. */
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

/** Every ACTIVE limit with what the period already spent against it. */
export function useLimitUsage() {
  return useQuery({
    queryKey: ['limits', 'usage'],
    queryFn: ({ signal }) => api<LimitUsage[]>('/limits/usage', { signal }),
  })
}

/**
 * The tenant's ACTIVE goals, one page of the hundred largest names — the
 * gauges render one per goal, and no tenant outgrows that page soon.
 */
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

/**
 * The tenant's ACTIVE recurring rules, one page of a hundred — the rules a
 * month's expectation projects from.
 */
export function useRecurringRules() {
  return useQuery({
    queryKey: ['recurring-transactions', 'dashboard'],
    queryFn: ({ signal }) =>
      api<PagedResults<RecurringTransaction>>(
        '/recurring-transactions/search',
        {
          method: 'POST',
          body: JSON.stringify({
            sort: [{ field: 'receiverName', dir: 'asc' }],
            filter: {},
            skip: 0,
            limit: 100,
          }),
          signal,
        }
      ),
  })
}

/**
 * The cards' current bills: the earliest Open bill of each card — what is
 * being charged right now.
 */
export function useCurrentBills(): CreditCardStatement[] {
  const open = useStatementSearch({
    sort: [{ field: 'closeDate', dir: 'asc' }],
    filter: { status: ['Open'] },
    skip: 0,
    limit: 100,
  })

  return firstPerCard(open.data?.items ?? [])
}

/**
 * What each card asks for next: its latest closed bill not yet paid in
 * full. Only the latest — its amount due already carries every earlier
 * remainder, so summing older bills would count the same debt twice.
 */
export function useNextDueBills(): CreditCardStatement[] {
  const unpaid = useStatementSearch({
    sort: [{ field: 'closeDate', dir: 'desc' }],
    filter: { status: ['Closed', 'PartiallyPaid', 'Overdue'] },
    skip: 0,
    limit: 100,
  })

  return firstPerCard(unpaid.data?.items ?? [])
}

/** The first bill of each card, in the order the search answered. */
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
