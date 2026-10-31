import type { Currency } from "./currencies.js"
import type { UnsplitMode } from "./household.js"

export interface CurrencyChangeConflict {
  message: string
  limits: number
  goals: number
  goalsOffCurrency: number
}

export interface TenantSettings {
  timezone: string
  mainCurrency: Currency
  timezoneConfirmed: boolean
  unsplitMode: UnsplitMode
  today: string
}

export interface SettingsDefaults {
  mainCurrency: Currency
}

export * from "./value/time-zone.js"
