import type { Currency } from "./currencies.js"
import type { SplitShare } from "./splits.js"
import type { MoneyTone } from "./value/money.js"

export const unsplitModes = ["personal", "household"] as const

export type UnsplitMode = (typeof unsplitModes)[number]

export const accountOwnerships = ["personal", "shared"] as const

export type AccountOwnership = (typeof accountOwnerships)[number]

export type LedgerEntry = {
  payerUserId: number | null
  currency: Currency
  amount: string
  shares: readonly SplitShare[]
}

export type MemberBalance = {
  userId: number
  currency: Currency
  balance: string
}

export type DebtTransfer = {
  currency: Currency
  fromUserId: number
  toUserId: number
  amount: string
}

export type HouseholdMember = {
  id: number
  name: string
  isActive: boolean
}

export type HouseholdBalance = {
  userId: number
  userName: string
  isActive: boolean
  currency: Currency
  balance: string
  tone: MoneyTone
}

export type SettleSuggestion = {
  currency: Currency
  fromUserId: number
  fromName: string
  toUserId: number
  toName: string
  amount: string
}

export type MemberSpending = {
  userId: number
  userName: string
  currency: Currency
  total: string
}

export type CategorySpending = {
  categoryId: number
  categoryName: string
  categoryColor: string
  currency: Currency
  total: string
}

export type SettlementEntry = {
  id: number
  transactionDt: string
  currency: Currency
  amount: string
  fromUserId: number
  fromName: string
  toUserId: number
  toName: string
  note: string | null
}

export type HouseholdOverviewArgs = {
  transactionDtFrom?: string | undefined
  transactionDtTo?: string | undefined
}

export type HouseholdOverview = {
  members: HouseholdMember[]
  unsplitMode: UnsplitMode
  balances: HouseholdBalance[]
  suggestions: SettleSuggestion[]
  byMember: MemberSpending[]
  byCategory: CategorySpending[]
  settlements: SettlementEntry[]
}

export type MemberBalanceCheck = {
  userId: number
  userName: string
  lines: Array<{
    currency: Currency
    balance: string
    absBalance: string
    tone: MoneyTone
  }>
}

export const SETTLEMENT_CATEGORY = {
  name: "Settlement",
  color: "#0F766E",
} as const
