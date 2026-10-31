import type { Currency } from "./currencies.js"
import type { EntityStatus, FetchArgs } from "./value/fetch.js"
import type { SplitInput } from "./splits.js"
import type { TransactionType } from "./transactions.js"

export const frequencies = ["Daily", "Weekly", "Monthly", "Yearly"] as const

export type Frequency = (typeof frequencies)[number]

export type RecurringTransactionFilter = {
  categoryId?: number | undefined
  receiverId?: number | undefined
  linkedAccountId?: number | undefined
  frequency?: Frequency | undefined
  status: EntityStatus
}

export type SearchRecurringTransactionsArgs = FetchArgs & {
  filter: RecurringTransactionFilter
}

export type RecurringTransaction = {
  id: number
  receiverId: number
  receiverName: string
  categoryId: number
  categoryName: string
  linkedAccountId: number
  accountName: string
  accountCurrency: Currency
  amount: string
  type: TransactionType
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
  nextDate: string | null
  paidByUserId: number | null
  paidByName: string | null
  defaultSplit: SplitInput | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}

export type NextOccurrencePreview = {
  nextDate: string | null
}
