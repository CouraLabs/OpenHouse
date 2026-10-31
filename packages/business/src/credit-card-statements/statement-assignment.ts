import type { TransactionType } from '@workspace/dto'

export interface StatementKey {
  linkedAccountId: number
  transactionDt: string
  type: TransactionType
  isTransferLeg: boolean
}

export interface StatementAssigned extends StatementKey {
  statementId: number | null
  statementPinned: boolean
}

export function isCardPayment(
  key: Pick<StatementKey, 'type' | 'isTransferLeg'>
) {
  return key.type === 'Income' && key.isTransferLeg
}

export function assignmentDecision(
  before: StatementAssigned,
  after: StatementKey
): 'keep' | 'resolve' {
  if (before.linkedAccountId !== after.linkedAccountId) {
    return 'resolve'
  }

  if (before.statementPinned) {
    return 'keep'
  }

  if (
    before.transactionDt !== after.transactionDt ||
    before.type !== after.type ||
    before.isTransferLeg !== after.isTransferLeg ||
    before.statementId === null
  ) {
    return 'resolve'
  }

  return 'keep'
}
