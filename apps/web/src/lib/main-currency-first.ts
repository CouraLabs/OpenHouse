import type { Currency } from '@workspace/poco'

/**
 * Orders per-currency groups so the tenant's main currency comes first; the
 * others keep the order the API answered with. A tenant with several
 * currencies reads its main one before the rest.
 */
export function mainCurrencyFirst<T extends { currency: Currency }>(
  groups: readonly T[],
  mainCurrency: Currency
): T[] {
  return [
    ...groups.filter((group) => group.currency === mainCurrency),
    ...groups.filter((group) => group.currency !== mainCurrency),
  ]
}
