import type { TransactionStatus, TransactionType } from '@workspace/poco'
import { negateMoney } from '@workspace/poco'

export function deltaFor(type: TransactionType, amount: string): string {
  return type === 'Income' ? amount : negateMoney(amount)
}

export function appliedDeltaFor(row: {
  type: TransactionType
  amount: string
  reviewStatus: TransactionStatus
}): string {
  return row.reviewStatus === 'Canceled'
    ? '0.00'
    : deltaFor(row.type, row.amount)
}
