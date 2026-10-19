import { z } from 'zod'

import type { Currency } from './currencies.js'
import { fetchArgsSchema } from './fetch.js'
import { compareMoney } from './money.js'

/**
 * The credit card statement routes' contract ("Bills" in the UI). A
 * statement is one cycle of one card; its totals and status are derived on
 * read from the card's transactions, so the wire carries them but no body
 * ever sends them.
 */

/**
 * Where a bill stands. Derived, never stored — see `deriveStatementStatus`
 * for the precedence.
 */
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

/** What a bill's status is derived from. `owed` is the previous balance
 * plus the bill's own total — what the bill must settle. */
export interface StatementStatusInput {
  /** The tenant's today, `YYYY-MM-DD`. */
  today: string
  /** The exclusive end of the period. */
  closeDate: string
  dueDate: string
  owed: string
  paid: string
}

/**
 * A bill's status; the first rule that matches wins:
 * Open while its period runs (payments then are prepaid); Paid once what
 * was paid covers what is owed — nothing owed included; Overdue past the
 * due date; PartiallyPaid with some payment; Closed otherwise.
 */
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

/** What a statement search filters on. */
export const statementFilterSchema = z.object({
  accountId: z.number().int().positive().optional(),
  status: z.array(statementStatusSchema).optional(),
})

/** The search route's body: the shared paging envelope with a filter. */
export const searchStatementsSchema = fetchArgsSchema.extend({
  filter: statementFilterSchema.prefault({}),
})

/** The body that moves a card charge to another bill of the same card. */
export const moveToStatementSchema = z.object({
  statementId: z
    .number({ error: 'Pick a bill.' })
    .int()
    .positive('Pick a bill.'),
})

export type StatementFilter = z.infer<typeof statementFilterSchema>
export type SearchStatementsArgs = z.infer<typeof searchStatementsSchema>
export type MoveToStatementBody = z.infer<typeof moveToStatementSchema>

/**
 * What the statement routes return. Days are `YYYY-MM-DD`; money is a
 * decimal string in the card's `currency`. `closesOn` is the bank's close
 * day as the bill shows it (`closeDate` is the exclusive period end, a day
 * later on an inclusive card).
 *
 * - `charges`: the card's expenses on the bill.
 * - `credits`: incomes on the bill that are not payments (refunds).
 * - `total`: `charges − credits`.
 * - `previousBalance`: what the card's earlier bills left unpaid (negative
 *   when they were overpaid).
 * - `paid`: the payments that settle this bill.
 * - `amountDue`: `previousBalance + total − paid`.
 */
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
  transactionCount: number
}

/** Raised on a write that landed on a bill already closed. */
export const STATEMENT_CLOSED = 'STATEMENT_CLOSED'

export type StatementWarning = typeof STATEMENT_CLOSED
