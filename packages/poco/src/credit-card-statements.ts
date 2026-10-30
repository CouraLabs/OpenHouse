import { z } from 'zod'

import type { Currency } from './currencies.js'
import { fetchArgsSchema } from './fetch.js'
import { amountSchema } from './limits.js'
import { compareMoney } from './money.js'

export const statementStatuses = [
  'Open',
  'Closed',
  'PartiallyPaid',
  'Overdue',
  'Paid',
] as const

export const statementStatusSchema = z.enum(statementStatuses, {
  error: 'Pick a status.',
})

export type StatementStatus = (typeof statementStatuses)[number]

export interface StatementStatusInput {
  today: string
  closeDate: string
  dueDate: string
  owed: string
  paid: string
}

export function deriveStatementStatus(
  input: StatementStatusInput
): StatementStatus {
  if (input.today < input.closeDate) {
    return 'Open'
  }

  if (compareMoney(input.paid, input.owed) >= 0) {
    return 'Paid'
  }

  if (input.today > input.dueDate) {
    return 'Overdue'
  }

  return compareMoney(input.paid, '0') > 0 ? 'PartiallyPaid' : 'Closed'
}

export const statementFilterSchema = z.object({
  accountId: z.number().int().positive().optional(),
  status: z.array(statementStatusSchema).optional(),
})

export const searchStatementsSchema = fetchArgsSchema.extend({
  filter: statementFilterSchema.prefault({}),
})

export const moveToStatementSchema = z.object({
  statementId: z
    .number({ error: 'Pick a bill.' })
    .int()
    .positive('Pick a bill.'),
})

export const statementBankFiguresSchema = z.object({
  minimumDue: amountSchema.nullable(),
  bankTotal: amountSchema.nullable(),
})

export const reconcileStatementSchema = z.object({
  bankTotal: amountSchema,
})

export type StatementFilter = z.infer<typeof statementFilterSchema>
export type SearchStatementsArgs = z.infer<typeof searchStatementsSchema>
export type MoveToStatementBody = z.infer<typeof moveToStatementSchema>
export type StatementBankFiguresBody = z.infer<
  typeof statementBankFiguresSchema
>
export type ReconcileStatementBody = z.infer<typeof reconcileStatementSchema>

export type ReconcileConflict = {
  message: string
  total: string
}

export type CreditCardStatement = {
  id: number
  accountId: number
  accountName: string
  currency: Currency
  periodStart: string
  closeDate: string
  closesOn: string
  dueDate: string
  closedAt: string | null
  charges: string
  credits: string
  total: string
  previousBalance: string
  paid: string
  amountDue: string
  status: StatementStatus
  carriedTo: string | null
  minimumDue: string | null
  bankTotal: string | null
  reconciledAt: string | null
  transactionCount: number
}

export const unpaidStatementStatuses: readonly StatementStatus[] = [
  'Closed',
  'PartiallyPaid',
  'Overdue',
]

export function isPrepaid(
  bill: Pick<CreditCardStatement, 'status' | 'paid'>
): boolean {
  return bill.status === 'Open' && compareMoney(bill.paid, '0') > 0
}

export function defaultPaymentStatement<
  T extends Pick<CreditCardStatement, 'status' | 'closeDate'>,
>(bills: readonly T[]): T | undefined {
  const ordered = [...bills].sort((a, b) =>
    a.closeDate.localeCompare(b.closeDate)
  )

  return (
    ordered.find((bill) => unpaidStatementStatuses.includes(bill.status)) ??
    ordered.find((bill) => bill.status === 'Open')
  )
}

export const STATEMENT_CLOSED = 'STATEMENT_CLOSED'

export type StatementWarning = typeof STATEMENT_CLOSED
