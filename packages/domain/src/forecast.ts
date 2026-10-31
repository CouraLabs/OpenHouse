import type { Currency } from "./currencies.js"
import type { DueRule } from "./recurrence.js"
import type { RecurringTransaction } from "./recurring-transactions.js"

export type ForecastRule = DueRule &
  Pick<RecurringTransaction, "type" | "amount" | "linkedAccountId">

export interface ForecastSlice {
  currency: Currency
  total: string
}

export interface ForecastOccurrence<T extends ForecastRule = ForecastRule> {
  date: string
  rule: T
}
