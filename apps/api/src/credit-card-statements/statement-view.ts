import {
  addMoney,
  deriveStatementStatus,
  displayCloseDate,
  isZeroMoney,
  negateMoney,
  type CreditCardStatement,
  type Currency,
} from '@workspace/poco'

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
  nextDueDate: string | null
}

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
