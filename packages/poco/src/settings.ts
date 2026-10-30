import { z } from 'zod'
import { currencySchema, type Currency } from './currencies.js'
import { unsplitModeSchema, type UnsplitMode } from './household.js'

let knownTimeZones: ReadonlySet<string> | undefined

export function isSupportedTimeZone(timeZone: string): boolean {
  knownTimeZones ??= new Set(Intl.supportedValuesOf('timeZone'))

  return timeZone === 'UTC' || knownTimeZones.has(timeZone)
}

export const timeZoneSchema = z
  .string()
  .refine(isSupportedTimeZone, { error: 'Pick a supported time zone.' })

export const updateSettingsSchema = z.object({
  timezone: timeZoneSchema,
  mainCurrency: currencySchema,
  confirmCurrencyChange: z.boolean().optional(),
  unsplitMode: unsplitModeSchema.optional(),
})

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>

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
}

export function dayIn(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

export function hourIn(instant: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(instant)
    .find((part) => part.type === 'hour')?.value

  return Number(hour ?? 0) % 24
}

export function todayIn(timeZone: string, now: Date = new Date()): string {
  return dayIn(now, timeZone)
}

const EURO_REGIONS = new Set([
  'AD',
  'AT',
  'BE',
  'CY',
  'DE',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MC',
  'ME',
  'MT',
  'NL',
  'PT',
  'SI',
  'SK',
  'SM',
  'VA',
  'XK',
])

const EURO_LANGUAGES = new Set([
  'de',
  'el',
  'et',
  'fi',
  'fr',
  'ga',
  'it',
  'lt',
  'lv',
  'mt',
  'nl',
  'sk',
  'sl',
])

export function currencyForLocale(locale: string): Currency {
  const [language = '', region] = locale.split(/[-_]/)

  if (region !== undefined) {
    const upper = region.toUpperCase()

    if (upper === 'BR') {
      return 'BRL'
    }

    return EURO_REGIONS.has(upper) ? 'EUR' : 'USD'
  }

  return EURO_LANGUAGES.has(language.toLowerCase()) ? 'EUR' : 'USD'
}
