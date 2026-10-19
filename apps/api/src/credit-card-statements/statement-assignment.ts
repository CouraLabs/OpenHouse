import type { TransactionType } from '@workspace/poco'

/** The fields of a transaction that decide which bill it lands on. */
export interface StatementKey {
  linkedAccountId: number
  transactionDt: string
  type: TransactionType
  /** Whether the row is one side of a transfer. */
  isTransferLeg: boolean
}

/** A row as stored: its key plus the bill it is on. */
export interface StatementAssigned extends StatementKey {
  statementId: number | null
  statementPinned: boolean
}

/**
 * Whether the card side of a transfer is a payment: money coming into a
 * card from another account settles a bill, it is not a charge, so it lands
 * on no bill by date. A transfer out of a card (a cash advance) is a charge.
 */
export function isCardPayment(
  key: Pick<StatementKey, 'type' | 'isTransferLeg'>
) {
  return key.type === 'Income' && key.isTransferLeg
}

/**
 * What an update does to a row's bill: `keep` it, or `resolve` it again
 * from the new key (which always clears the pin).
 *
 * - Moving to another account re-resolves — a pin names a bill of the old
 *   card and means nothing on the new one.
 * - A pinned row keeps its bill through any date edit: the user put it
 *   there by hand.
 * - A changed day or direction re-resolves; so does a row with no bill yet
 *   (a card whose days were only just set).
 * - Anything else keeps the bill, so editing a name never re-resolves a
 *   charge with days the card changed since.
 */
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
