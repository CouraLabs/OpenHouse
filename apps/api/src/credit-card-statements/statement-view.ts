import {
  addMoney,
  deriveStatementStatus,
  displayCloseDate,
  isZeroMoney,
  negateMoney,
  type CreditCardStatement,
  type Currency,
} from '@workspace/poco'

/** A bill with its derived totals and the card's display fields joined —
 * what every totals read answers. */
export interface StatementTotalsRow {
  id: number
  accountId: number
  accountName: string
  currency: Currency
  closeDayInclusive: boolean
  periodStart: string
  closeDate: string
  dueDate: string
  closedAt: Date | null
  minimumDue: string | null
  bankTotal: string | null
  reconciledAt: Date | null
  transactionCount: number
  paymentCount: number
  charges: string
  credits: string
  total: string
  paid: string
  previousBalance: string
  /** The due date of the card's next bill, or nothing on its latest. */
  nextDueDate: string | null
}

/**
 * Composes a bill's wire shape: `amountDue = previousBalance + total −
 * paid`, the status derived against the tenant's today, and `carriedTo` —
 * the next bill's due date once this one is closed with something left
 * over (a remainder or a credit), which the next bill's `previousBalance`
 * already carries.
 */
export function toStatement(
  row: StatementTotalsRow,
  today: string
): CreditCardStatement {
  const owed = addMoney(row.previousBalance, row.total)
  const amountDue = addMoney(owed, negateMoney(row.paid))
  const status = deriveStatementStatus({
    today,
    closeDate: row.closeDate,
    dueDate: row.dueDate,
    owed,
    paid: row.paid,
  })

  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.accountName,
    currency: row.currency,
    periodStart: row.periodStart,
    closeDate: row.closeDate,
    closesOn: displayCloseDate(row, row),
    dueDate: row.dueDate,
    closedAt: row.closedAt === null ? null : row.closedAt.toISOString(),
    charges: row.charges,
    credits: row.credits,
    total: row.total,
    previousBalance: row.previousBalance,
    paid: row.paid,
    amountDue,
    status,
    carriedTo:
      status === 'Open' || isZeroMoney(amountDue) ? null : row.nextDueDate,
    minimumDue: row.minimumDue,
    bankTotal: row.bankTotal,
    reconciledAt:
      row.reconciledAt === null ? null : row.reconciledAt.toISOString(),
    transactionCount: row.transactionCount,
  }
}
