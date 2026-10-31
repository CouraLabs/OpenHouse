import type { TransactionStatus, TransactionType } from '@workspace/dto'

import { addMoney, negateMoney } from '../calc/money.js'

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

export function revertDeltaFor(row: {
  type: TransactionType
  amount: string
  reviewStatus: TransactionStatus
}): string {
  return negateMoney(appliedDeltaFor(row))
}

export function shiftDeltaFor(
  before: { type: TransactionType; amount: string; reviewStatus: TransactionStatus },
  after: { type: TransactionType; amount: string; reviewStatus: TransactionStatus }
): string {
  return addMoney(appliedDeltaFor(after), negateMoney(appliedDeltaFor(before)))
}

export function isLocked(row: {
  transactionDt: string
  accountReconciledThrough: string | null
}): boolean {
  return (
    row.accountReconciledThrough !== null &&
    row.transactionDt <= row.accountReconciledThrough
  )
}

export function isPaymentRow(row: {
  type: TransactionType
  transferGroupId: string | null
  statementId: number | null
}): boolean {
  return (
    row.type === 'Income' &&
    row.transferGroupId !== null &&
    row.statementId === null
  )
}
