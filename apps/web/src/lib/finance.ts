/**
 * The finance math the projection tools run: rate conversions between
 * periods, the annuity payment, and the number formatters the results
 * render through. Pure functions — the tools hold no data of their own.
 */

import type { Currency } from '@workspace/poco'

/** The period a rate is quoted for: a year, a month, or a business day. */
export type RateUnit = 'year' | 'month' | 'day'

/** How many `from` periods one `to` period holds — a year holds 12 months
 * and 252 business days, a month holds 22 business days; the market's
 * counts. The exponent a conversion compounds by. */
const FACTORS: Record<RateUnit, Record<RateUnit, number>> = {
  year: { year: 1, month: 1 / 12, day: 1 / 252 },
  month: { year: 12, month: 1, day: 1 / 22 },
  day: { year: 252, month: 22, day: 1 },
}

/**
 * The equivalent rate per the given unit, by compounding — never by
 * dividing: 10% a year is 0.797% a month, not 0.833%.
 */
export function periodicRate(annual: number, unit: RateUnit): number {
  return (1 + annual) ** FACTORS.year[unit] - 1
}

/** One rate restated in another unit, compounding across the periods. */
export function convertRate(
  rate: number,
  from: RateUnit,
  to: RateUnit
): number {
  return (1 + rate) ** FACTORS[from][to] - 1
}

/**
 * A nominal rate net of the proportional drags (inflation, fees) applied
 * multiplicatively — the sheet's `(1 + i) / (1 + drags) - 1`.
 */
export function realRate(nominal: number, drags: number): number {
  return (1 + nominal) / (1 + drags) - 1
}

/**
 * Excel's `PMT`: the payment of an annuity-immediate — every period, the
 * first one a full period from now. Signs follow the cash-flow convention:
 * a positive `pv` (money received) answers a negative payment, the same
 * way the spreadsheets this app ports call it.
 */
export function pmt(rate: number, nper: number, pv: number, fv = 0): number {
  if (rate === 0) {
    return -(pv + fv) / nper
  }

  const growth = (1 + rate) ** nper

  return (-(pv * growth + fv) * rate) / (growth - 1)
}

/** A number as the locale reads it, up to two fraction digits. */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    value
  )
}

/** A rate fraction (0.0079) as the locale's percent (0.79%). */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 4,
  }).format(value)
}

/** A money axis tick: compact currency that keeps the chart readable. */
export function compactMoney(
  locale: string,
  currency: Currency
): (value: number) => string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  return (value) => formatter.format(value)
}
