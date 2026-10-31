import type { Currency } from "./currencies.js"
import type { Transaction } from "./transactions.js"
import type { MoneyTone } from "./value/money.js"

export const BALANCE_ADJUSTMENT_CATEGORY = {
  name: "Balance adjustment",
  color: "#94A3B8",
} as const

export const BALANCE_ADJUSTMENT_NAME = "Balance adjustment"

export type ReconcilePreview = {
  accountId: number
  currency: Currency
  date: string
  bankBalance: string
  computedBalance: string
  difference: string
  tone: MoneyTone
  verifyRows: Transaction[]
  verifyCount: number
}

export type ReconcileResult = {
  reconciledThrough: string
  balance: string
  adjustment: Transaction | null
  checkedCount: number
}

export type ReconciledEditConflict = {
  message: string
  reconciledThrough: string
}

export const MAX_BALANCE_HISTORY_DAYS = 731

export type BalanceHistoryPoint = {
  date: string
  balance: string
}

export type BalanceHistory = {
  accountId: number
  currency: Currency
  points: BalanceHistoryPoint[]
}

export type BalanceDrift = {
  accountId: number
  name: string
  balance: string
  expected: string
  drift: string
}

export type BalanceConsistency = {
  checked: number
  drifts: BalanceDrift[]
}
