import type { Currency } from '@workspace/dto'

import { amountsHidden } from './privacy.js'

const MINUS = '−'
const MASK = '•••••'

export function formatMoney(
  amount: string,
  locale: string,
  currency: Currency,
  options: { signed?: boolean } = {}
): string {
  const value = Number(amount)
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    signDisplay: options.signed === true ? 'exceptZero' : 'auto',
  }).formatToParts((value === 0 ? '0' : amount) as Intl.StringNumericLiteral)

  if (amountsHidden()) {
    return parts
      .filter((part) => part.type === 'currency' || part.type === 'literal')
      .map((part) => part.value)
      .join('')
      .concat(MASK)
      .trim()
  }

  return parts
    .map((part) => (part.type === 'minusSign' ? MINUS : part.value))
    .join('')
}

export function asOutflow(amount: string): string {
  return amount.startsWith('-') || Number(amount) === 0 ? amount : `-${amount}`
}
