import type { Currency } from "./currencies.js"
import type { EntityStatus, FetchArgs } from "./value/fetch.js"
import type { AccountOwnership } from "./household.js"

export const accountTypes = [
  "Checking",
  "Wallet",
  "Savings",
  "Credit Card",
] as const

export type AccountType = (typeof accountTypes)[number]

export type AccountFilter = {
  type?: AccountType | undefined
  status: EntityStatus
}

export type SearchAccountsArgs = FetchArgs & {
  filter: AccountFilter
}

export const SPREAD_WARNING_PCT = 20

export type AccountRef = {
  id: number
  name: string
  type: AccountType
  currency: Currency
  isDefault: boolean
  ownership: AccountOwnership
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  availableLimit: string | null
  balance: string
}

export type Account = {
  id: number
  name: string
  agency: string | null
  number: string | null
  type: AccountType
  balance: string
  openingBalance: string
  openingDt: string
  reconciledThrough: string | null
  currency: Currency
  spreadPct: string
  limit: string | null
  availableLimit: string | null
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  isDefault: boolean
  ownership: AccountOwnership
  status: EntityStatus
  createdDt: string
  updateDt: string
}

export interface AccountDeleteConflict {
  message: string
  unpaidBills: number
  amountDue: string
  currency: Currency
}

export type AccountPreview = {
  spreadWarning: boolean
  spreadWarningPct: number
  cycleDaysDiffer: boolean
  cycleGapWarning: "short" | "long" | null
}
