import type { Currency } from '@workspace/poco'

export type RateUnit = 'year' | 'month' | 'day'

const FACTORS: Record<RateUnit, Record<RateUnit, number>> = {
  year: { year: 1, month: 1 / 12, day: 1 / 252 },
  month: { year: 12, month: 1, day: 1 / 22 },
  day: { year: 252, month: 22, day: 1 },
}

export function periodicRate(annual: number, unit: RateUnit): number {
  return (1 + annual) ** FACTORS.year[unit] - 1
}

export function convertRate(
  rate: number,
  from: RateUnit,
  to: RateUnit
): number {
  return (1 + rate) ** FACTORS[from][to] - 1
}

export function realRate(nominal: number, drags: number): number {
  return (1 + nominal) / (1 + drags) - 1
}

export function pmt(rate: number, nper: number, pv: number, fv = 0): number {
  if (rate === 0) {
    return -(pv + fv) / nper
  }

  const growth = (1 + rate) ** nper

  return (-(pv * growth + fv) * rate) / (growth - 1)
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    value
  )
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 4,
  }).format(value)
}

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
