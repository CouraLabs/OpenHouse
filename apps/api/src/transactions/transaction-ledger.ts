import type { TransactionStatus, TransactionType } from '@workspace/poco'
import { negateMoney } from '@workspace/poco'

/**
 * The delta a transaction applies to its account: income adds, expense
 * subtracts. A credit card's expense subtracts like any other — spending
 * reduces what is available the same way.
 */
export function deltaFor(type: TransactionType, amount: string): string {
  return type === 'Income' ? amount : negateMoney(amount)
}

/**
 * The delta a transaction has applied to its account given its review
 * status: a Canceled transaction is money that did not move, so it applies
 * nothing — the same rule the summary, the breakdown, and the limit usage
 * filter by. Every write reverts and applies through this, so a Canceled
 * row is never reverted for a delta it never applied.
 */
export function appliedDeltaFor(row: {
  type: TransactionType
  amount: string
  reviewStatus: TransactionStatus
}): string {
  return row.reviewStatus === 'Canceled'
    ? '0.00'
    : deltaFor(row.type, row.amount)
}
