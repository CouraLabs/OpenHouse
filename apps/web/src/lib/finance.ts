import type { Currency } from '@workspace/dto'

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
