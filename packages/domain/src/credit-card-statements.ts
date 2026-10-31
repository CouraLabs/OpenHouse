import type { Currency } from "./currencies.js"
import type { FetchArgs } from "./value/fetch.js"
import type { MoneyTone } from "./value/money.js"

export const statementStatuses = [
  "Open",
  "Closed",
  "PartiallyPaid",
  "Overdue",
  "Paid",
] as const

export type StatementStatus = (typeof statementStatuses)[number]

export type StatementFilter = {
  accountId?: number | undefined
  status?: StatementStatus[] | undefined
}

export type SearchStatementsArgs = FetchArgs & {
  filter: StatementFilter
}

export type StatementBankFiguresBody = {
  minimumDue: string | null
  bankTotal: string | null
}

export interface StatementStatusInput {
  today: string
  closeDate: string
  dueDate: string
  owed: string
  paid: string
}

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
  amountDueTone: MoneyTone
  status: StatementStatus
  carriedTo: string | null
  carriedAmount: string | null
  minimumDue: string | null
  bankTotal: string | null
  reconciledAt: string | null
  transactionCount: number
  isPrepaid: boolean
  isDefaultPayment: boolean
  daysUntilClose: number
  daysUntilDue: number
  window: { start: string; end: string }
}

export type StatementReconcilePreview = {
  difference: string
  tone: MoneyTone
}

export const unpaidStatementStatuses: readonly StatementStatus[] = [
  "Closed",
  "PartiallyPaid",
  "Overdue",
]

export const STATEMENT_CLOSED = "STATEMENT_CLOSED"

export type StatementWarning = typeof STATEMENT_CLOSED
