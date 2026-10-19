import {
  addMoney,
  deriveStatementStatus,
  displayCloseDate,
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
  transactionCount: number
  charges: string
  credits: string
  total: string
  paid: string
  previousBalance: string
}

/**
 * Composes a bill's wire shape: `amountDue = previousBalance + total −
 * paid`, and the status derived against the tenant's today.
 */
export function toStatement(
  row: StatementTotalsRow,
  today: string
): CreditCardStatement {
  const owed = addMoney(row.previousBalance, row.total)

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
    amountDue: addMoney(owed, negateMoney(row.paid)),
    status: deriveStatementStatus({
      today,
      closeDate: row.closeDate,
      dueDate: row.dueDate,
      owed,
      paid: row.paid,
    }),
    transactionCount: row.transactionCount,
  }
}
