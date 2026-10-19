import { z } from 'zod'

import type { Currency } from './currencies.js'
import { fetchArgsSchema } from './fetch.js'
import { amountSchema } from './limits.js'
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

/**
 * The figures printed on the bank's bill that the user types in: the
 * minimum payment (shown only — the app never computes it) and the bill's
 * total. Nothing clears them but sending `null`.
 */
export const statementBankFiguresSchema = z.object({
  minimumDue: amountSchema.nullable(),
  bankTotal: amountSchema.nullable(),
})

/**
 * The body that reconciles a bill: the total printed on the bank's bill.
 * It must equal the bill's own `total`; the API then stamps `reconciledAt`
 * and marks the bill's Verify rows Checked.
 */
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

/** The 409 a reconcile answers while the bank's total differs from the
 * bill's: the bill's own total, so the form can show the difference. */
export type ReconcileConflict = {
  message: string
  total: string
}

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
 * - `paid`: the payments that settle this bill — chosen explicitly when
 *   paid, never resolved from the payment's day.
 * - `amountDue`: `previousBalance + total − paid`; it rolls into the next
 *   bill's `previousBalance`, so it is negative when overpaid (a credit).
 * - `carriedTo`: the due date of the next bill when this one is closed and
 *   its `amountDue` rolled forward into it — the remainder (or the credit)
 *   is that bill's to settle, and no total sums it again here.
 * - `minimumDue`, `bankTotal`: typed in from the bank's bill.
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
  carriedTo: string | null
  minimumDue: string | null
  bankTotal: string | null
  reconciledAt: string | null
  transactionCount: number
}

/** The statuses of a closed bill that still asks for money. */
export const unpaidStatementStatuses: readonly StatementStatus[] = [
  'Closed',
  'PartiallyPaid',
  'Overdue',
]

/** Whether a bill is paid ahead of its close ("prepaid"): still Open, with
 * a payment already settling it. */
export function isPrepaid(
  bill: Pick<CreditCardStatement, 'status' | 'paid'>
): boolean {
  return bill.status === 'Open' && compareMoney(bill.paid, '0') > 0
}

/**
 * The bill a payment into a card settles when nobody picked one: the
 * card's oldest closed bill still unpaid, otherwise its earliest Open bill
 * (the one running now). Nothing when the card has neither — the API then
 * opens the bill today lands on. Shared by the API, which defaults a
 * transfer into a card through it, and the transfer form's Bill picker.
 */
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

/** Raised on a write that landed on a bill already closed. */
export const STATEMENT_CLOSED = 'STATEMENT_CLOSED'

export type StatementWarning = typeof STATEMENT_CLOSED
