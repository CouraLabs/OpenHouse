import type { Currency } from '@workspace/poco'

export function mainCurrencyFirst<T extends { currency: Currency }>(
  groups: readonly T[],
  mainCurrency: Currency
): T[] {
  return [
    ...groups.filter((group) => group.currency === mainCurrency),
    ...groups.filter((group) => group.currency !== mainCurrency),
  ]
}
