import type { Currency } from "./currencies.js"
import type { EntityStatus, FetchArgs } from "./value/fetch.js"

export const limitTypes = ["Daily", "Weekly", "Monthly", "Yearly"] as const

export type LimitType = (typeof limitTypes)[number]

export type LimitFilter = {
  categoryId?: number | undefined
  type?: LimitType | undefined
  status: EntityStatus
}

export type SearchLimitsArgs = FetchArgs & {
  filter: LimitFilter
}

export type LimitUsage = {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
  spent: string
  excludedCount: number
}

export type Limit = {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
}
