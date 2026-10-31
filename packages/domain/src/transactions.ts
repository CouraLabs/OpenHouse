import type { StatementWarning } from "./credit-card-statements.js"
import type { Currency } from "./currencies.js"
import type { ForecastSlice } from "./forecast.js"
import type { EntityStatus, FetchArgs } from "./value/fetch.js"
import type { MoneyTone } from "./value/money.js"

export const transactionTypes = ["Income", "Expense"] as const

export type TransactionType = (typeof transactionTypes)[number]

export const transactionStatuses = ["Verify", "Canceled", "Checked"] as const

export type TransactionStatus = (typeof transactionStatuses)[number]

export const MAX_INSTALLMENTS = 48

export const installmentAmountModes = ["total", "perInstallment"] as const

export type InstallmentAmountMode = (typeof installmentAmountModes)[number]

export const installmentDeleteScopes = ["all", "remaining"] as const

export type InstallmentDeleteScope = (typeof installmentDeleteScopes)[number]

export const creditModes = ["accrual", "cash"] as const

export type CreditMode = (typeof creditModes)[number]

export const CARD_PAYMENT_CATEGORY = {
  name: "Credit card payment",
  color: "#64748B",
} as const

export const TRANSFER_CATEGORY = {
  name: "Transfer",
  color: "#64748B",
} as const

export type BilledOnPreview = {
  dueDate: string
  closeDate: string
}

export type InstallmentsPreview = {
  parts: string[]
  total: string
  extra: string | null
  availableAfter: string | null
  availableAfterTone: MoneyTone | null
}

export type Transaction = {
  id: number
  name: string
  note: string | null
  invoice: string | null
  amount: string
  transactionDt: string
  balanceOnDt: string
  runningBalance: string
  isAdjustment: boolean
  locked: boolean
  linkedAccountId: number
  accountName: string
  currency: Currency
  categoryId: number
  categoryName: string
  categoryColor: string
  receiverId: number | null
  receiverName: string | null
  recurringId: number | null
  type: TransactionType
  status: TransactionStatus
  statusNote: string | null
  lifecycle: EntityStatus
  transferGroupId: string | null
  statementId: number | null
  statementPinned: boolean
  statementDueDate: string | null
  billedOn: BilledOnPreview | null
  paymentStatementId: number | null
  paymentStatementDueDate: string | null
  installmentGroupId: string | null
  installmentNumber: number | null
  installmentCount: number | null
  paidByUserId: number | null
  paidByName: string | null
  isSettlement: boolean
  splits: TransactionSplitShare[]
  warning: StatementWarning | null
  createdDt: string
  updateDt: string
}

export type TransactionSplitShare = {
  userId: number
  userName: string
  share: string
}

export type InstallmentGroup = {
  groupId: string
  name: string
  note: string | null
  categoryId: number
  receiverId: number | null
  linkedAccountId: number
  currency: Currency
  transactionDt: string
  count: number
  total: string
  editable: boolean
  installments: Transaction[]
}

export type InstallmentRefund = {
  refund: Transaction | null
}

export const INSTALLMENTS_BILLED =
  "Some installments were already billed. Use 'Delete remaining' and create a new purchase for the rest."

export type TransactionSummaryGroup = {
  currency: Currency
  incomes: string
  expenses: string
  net: string
  creditExpenses: string
}

export type TransactionSummary = {
  groups: TransactionSummaryGroup[]
  forecastNextMonth: ForecastSlice[]
}

export const transactionBreakdownDimensions = ["category", "account"] as const

export type TransactionBreakdownDimension =
  (typeof transactionBreakdownDimensions)[number]

export type TransactionFilter = {
  transactionDtFrom?: string | undefined
  transactionDtTo?: string | undefined
  categoryId?: number | undefined
  linkedAccountId?: number | undefined
  receiverId?: number | undefined
  type?: TransactionType | undefined
  status?: TransactionStatus | undefined
  statementId?: number | undefined
  paymentStatementId?: number | undefined
  creditMode: CreditMode
  lifecycle: EntityStatus
}

export type SearchTransactionsArgs = FetchArgs & {
  filter: TransactionFilter
}

export type TransactionBreakdownArgs = TransactionFilter & {
  dimension: TransactionBreakdownDimension
}

export type TransactionBreakdownItem = {
  name: string
  color: string | null
  total: string
}

export type TransactionBreakdownGroup = {
  currency: Currency
  items: TransactionBreakdownItem[]
}

export type TransactionBreakdown = {
  groups: TransactionBreakdownGroup[]
}

export const transactionHistoryActions = ["CREATE", "UPDATE", "DELETE"] as const

export type TransactionHistoryAction =
  (typeof transactionHistoryActions)[number]

export type TransactionHistoryEntry = {
  id: number
  transactionId: number
  action: TransactionHistoryAction
  before: unknown | null
  after: unknown | null
  createdBy: number | null
  createdDt: string
}
