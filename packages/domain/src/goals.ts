import type { Currency } from "./currencies.js"
import type { EntityStatus, FetchArgs } from "./value/fetch.js"

export type GoalFilter = {
  linkedAccountId?: number | undefined
  status: EntityStatus
}

export type SearchGoalsArgs = FetchArgs & {
  filter: GoalFilter
}

export type Goal = {
  id: number
  name: string
  linkedAccountId: number
  accountName: string
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
  currency: Currency
  accountCurrency: Currency
  accountBalance: string
  status: EntityStatus
  createdDt: string
  updateDt: string
}
