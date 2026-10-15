import type { Currency } from '@workspace/poco'

/**
 * Formats an amount as money in the user's locale and currency. The
 * currency decides the symbol; the locale decides the separators and where
 * the symbol sits. Defaults to US dollars — the currency the amounts that
 * predate a per-row currency were written in. The decimal string is handed
 * to the formatter as it is: no stop crosses a float, so a 14-digit
 * balance formats exactly.
 */
export function formatMoney(
  amount: string,
  locale: string,
  currency: Currency = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}
