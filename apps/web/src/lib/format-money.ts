import type { Currency } from '@workspace/poco'

export function formatMoney(
  amount: string,
  locale: string,
  currency: Currency
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount as Intl.StringNumericLiteral)
}
