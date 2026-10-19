import type { Currency } from '@workspace/poco'

/**
 * Formats an amount as money in the user's locale and currency. The
 * currency decides the symbol; the locale decides the separators and where
 * the symbol sits. There is no default: a row passes its own currency, and
 * an amount without one passes the tenant's main currency
 * (`useMainCurrency`). The decimal string is handed to the formatter as it
 * is: no stop crosses a float, so a 14-digit balance formats exactly.
 */
export function formatMoney(
  amount: string,
  locale: string,
  currency: Currency
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // The formatter takes a decimal string exactly; the lib types only
    // admit it under the numeric-literal name.
  }).format(amount as Intl.StringNumericLiteral)
}
