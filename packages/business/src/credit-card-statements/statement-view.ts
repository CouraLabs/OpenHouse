import type { CreditCardStatement, Currency } from '@workspace/dto'

import { addDays, daysBetween } from '../calc/dates.js'
import { addMoney, isZeroMoney, moneyTone, negateMoney } from '../calc/money.js'
import { deriveStatementStatus, isPrepaid } from './credit-card-statements.js'
import { displayCloseDate } from '../calc/credit-card-cycle.js'

const LATE_POSTING_DAYS = 3

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
  today: string,
  isDefaultPayment = false
): CreditCardStatement {
  const owed = addMoney(row.previousBalance, row.total)
  const amountDue = addMoney(owed, negateMoney(row.paid))
  const amountDueTone = moneyTone(amountDue)
  const status = deriveStatementStatus({
    today,
    closeDate: row.closeDate,
    dueDate: row.dueDate,
    owed,
    paid: row.paid,
  })
  const closesOn = displayCloseDate(row, row)
  const carriedTo =
    status === 'Open' || isZeroMoney(amountDue) ? null : row.nextDueDate
  const carriedAmount =
    carriedTo === null
      ? null
      : amountDueTone === 'negative'
        ? negateMoney(amountDue)
        : amountDue

  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.accountName,
    currency: row.currency,
    periodStart: row.periodStart,
    closeDate: row.closeDate,
    closesOn,
    dueDate: row.dueDate,
    closedAt: row.closedAt === null ? null : row.closedAt.toISOString(),
    charges: row.charges,
    credits: row.credits,
    total: row.total,
    previousBalance: row.previousBalance,
    paid: row.paid,
    amountDue,
    amountDueTone,
    status,
    carriedTo,
    carriedAmount,
    minimumDue: row.minimumDue,
    bankTotal: row.bankTotal,
    reconciledAt:
      row.reconciledAt === null ? null : row.reconciledAt.toISOString(),
    transactionCount: row.transactionCount,
    isPrepaid: isPrepaid({ status, paid: row.paid }),
    isDefaultPayment,
    daysUntilClose: daysBetween(today, closesOn),
    daysUntilDue: daysBetween(today, row.dueDate),
    window: {
      start: addDays(closesOn, -LATE_POSTING_DAYS),
      end: addDays(closesOn, LATE_POSTING_DAYS),
    },
  }
}
