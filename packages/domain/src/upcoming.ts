import type { AccountType } from "./accounts.js"
import type { CreditCardStatement } from "./credit-card-statements.js"
import type { Currency } from "./currencies.js"
import type { Goal } from "./goals.js"
import type { LimitType, LimitUsage } from "./limits.js"
import type { RecurringTransaction } from "./recurring-transactions.js"
import type { TransactionType } from "./transactions.js"

export const DEFAULT_UPCOMING_DAYS = 30

export const MAX_UPCOMING_DAYS = 365

export const LIMIT_WARNING_PERCENT = 80

export const upcomingKinds = ["bill", "recurring", "limit", "goal"] as const

export type UpcomingKind = (typeof upcomingKinds)[number]

export interface UpcomingBill {
  kind: "bill"
  key: string
  date: string
  statementId: number
  accountId: number
  accountName: string
  currency: Currency
  amount: string
  estimate: boolean
  overdue: boolean
}

export interface UpcomingRecurring {
  kind: "recurring"
  key: string
  date: string
  ruleId: number
  name: string
  accountId: number
  accountName: string
  currency: Currency
  amount: string
  type: TransactionType
}

export interface UpcomingLimit {
  kind: "limit"
  key: string
  date: string
  limitId: number
  categoryName: string
  limitType: LimitType
  currency: Currency
  spent: string
  amount: string
  percent: number
}

export interface UpcomingGoal {
  kind: "goal"
  key: string
  date: string
  goalId: number
  name: string
  currency: Currency
  shortfall: string
  targetDt: string | null
}

export type UpcomingItem =
  | UpcomingBill
  | UpcomingRecurring
  | UpcomingLimit
  | UpcomingGoal

export interface ProjectionPoint {
  date: string
  balance: string
}

export interface FirstNegative {
  date: string
  balance: string
}

export interface ProjectedBalance {
  accountId: number | null
  accountName: string | null
  currency: Currency
  startBalance: string
  endBalance: string
  points: ProjectionPoint[]
  firstNegative: FirstNegative | null
}

export interface UpcomingResponse {
  from: string
  to: string
  items: UpcomingItem[]
  balances: ProjectedBalance[]
}

export interface BalanceEvent {
  date: string
  amount: string
}

export interface UpcomingAccount {
  id: number
  name: string
  currency: Currency
  type: AccountType
  balance: string
}

export interface UpcomingGoalInput {
  goal: Pick<
    Goal,
    | "id"
    | "name"
    | "balance"
    | "balanceDt"
    | "targetBalance"
    | "targetDt"
    | "currency"
  >
  currentBalance: string
}

export type UpcomingRule = Pick<
  RecurringTransaction,
  | "id"
  | "receiverName"
  | "linkedAccountId"
  | "accountName"
  | "accountCurrency"
  | "amount"
  | "type"
  | "frequency"
  | "frequencyDay"
  | "frequencyMonth"
>

export type UpcomingLimitInput = Pick<
  LimitUsage,
  "id" | "categoryName" | "amount" | "type" | "currency" | "spent"
>

export interface UpcomingInput {
  today: string
  days: number
  accounts: readonly UpcomingAccount[]
  bills: readonly CreditCardStatement[]
  rules: readonly UpcomingRule[]
  materializedToday: ReadonlySet<number>
  limits: readonly UpcomingLimitInput[]
  goals: readonly UpcomingGoalInput[]
}
