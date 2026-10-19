import { z } from 'zod'
import { currencySchema, type Currency } from './currencies.js'

/**
 * The tenant's global settings: the time zone that decides what "today" is,
 * and the main currency new records default to. One row per tenant; every
 * signed-in user reads it, only an owner writes it.
 */

/** The IANA zones the runtime knows, read once on first use. */
let knownTimeZones: ReadonlySet<string> | undefined

/**
 * Whether a string names an IANA time zone the runtime supports. `UTC` is
 * always accepted: some runtimes leave it out of `supportedValuesOf`.
 */
export function isSupportedTimeZone(timeZone: string): boolean {
  knownTimeZones ??= new Set(Intl.supportedValuesOf('timeZone'))

  return timeZone === 'UTC' || knownTimeZones.has(timeZone)
}

/** An IANA time zone name, e.g. `America/Sao_Paulo`. */
export const timeZoneSchema = z
  .string()
  .refine(isSupportedTimeZone, { error: 'Pick a supported time zone.' })

/**
 * The body `PUT settings` accepts — owner only. Limits and goals are
 * denominated in the main currency, so changing it re-denominates them
 * without converting any amount: the API answers 409 with a
 * `CurrencyChangeConflict` until the body confirms the change.
 */
export const updateSettingsSchema = z.object({
  timezone: timeZoneSchema,
  mainCurrency: currencySchema,
  confirmCurrencyChange: z.boolean().optional(),
})

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>

/** The 409 body of a main-currency change that was not confirmed: what the
 * change would re-denominate. */
export interface CurrencyChangeConflict {
  message: string
  /** The ACTIVE limits that would be read in the new currency. */
  limits: number
  /** The ACTIVE goals that would be read in the new currency. */
  goals: number
  /** Of those goals, the ones whose account is not in the new currency —
   * they stop tracking it. */
  goalsOffCurrency: number
}

/** The settings as `GET settings` and the session carry them. */
export interface TenantSettings {
  timezone: string
  mainCurrency: Currency
  /** False while a migrated tenant still runs on the `UTC` placeholder;
   * the owner is asked to confirm the zone until it is saved once. */
  timezoneConfirmed: boolean
}

/**
 * The `YYYY-MM-DD` calendar day an instant falls on in a time zone. Pure:
 * the instant is an argument, so callers inject their clock.
 */
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

/** Today, as a `YYYY-MM-DD` day, in the tenant's time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return dayIn(now, timeZone)
}

/** The eurozone regions, whose locales default to the euro. */
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

/** The languages that, without a region, read as a eurozone locale. */
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

/**
 * The currency a browser locale suggests for a new tenant: `pt-BR` reads as
 * BRL, a eurozone locale as EUR, everything else as USD. The region decides
 * when the locale names one; a bare language falls back to its usual zone.
 */
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
