/**
 * Decimal money strings — the shape every `numeric(16,2)` column maps to —
 * added, compared, and split exactly on BigInt cents. Money never travels
 * through a float: the API's ledger and the web's installment previews run
 * these same functions.
 */

/** Reads a decimal money string (`"12.34"`, `"-5"`, `"0.1"`) into cents. */
export function toCents(value: string): bigint {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(value)

  if (match === null) {
    throw new Error(`"${value}" is not a decimal money string.`)
  }

  const [, sign, whole, fraction = ''] = match
  const cents = BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))

  return sign === undefined ? cents : -cents
}

/** Formats cents back into the two-decimal string the columns store. */
export function formatCents(cents: bigint): string {
  const sign = cents < 0n ? '-' : ''
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${sign}${whole}.${fraction}`
}

/**
 * Adds two decimal money strings exactly. Either may be negative (a credit
 * card's balance runs negative).
 */
export function addMoney(a: string, b: string): string {
  return formatCents(toCents(a) + toCents(b))
}

/** Negates a decimal money string, for reverting a delta. */
export function negateMoney(a: string): string {
  return formatCents(-toCents(a))
}

/** Whether an amount is zero, so a write can skip touching the account. */
export function isZeroMoney(amount: string): boolean {
  return toCents(amount) === 0n
}

/** Orders two money strings by their cents: -1, 0, or 1. */
export function compareMoney(a: string, b: string): -1 | 0 | 1 {
  const left = toCents(a)
  const right = toCents(b)

  if (left < right) {
    return -1
  }

  return left > right ? 1 : 0
}

/**
 * Splits a purchase into `count` installment amounts, installment 1 first.
 * From a `total`: integer cents, `floor(total / count)` each, the remainder
 * cents on installment 1 — so the parts always add up to the total exactly
 * (`1000.00 / 3 → 333.34, 333.33, 333.33`). From a `perInstallment` amount
 * (an interest-bearing plan): `count` equal parts, the total being
 * `count × amount`.
 */
export function splitInstallments(
  amount: string,
  count: number,
  mode: 'total' | 'perInstallment'
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`${count} is not an installment count.`)
  }

  if (mode === 'perInstallment') {
    return Array.from({ length: count }, () => formatCents(toCents(amount)))
  }

  const total = toCents(amount)
  const base = total / BigInt(count)
  const remainder = total - base * BigInt(count)

  return Array.from({ length: count }, (_, index) =>
    formatCents(index === 0 ? base + remainder : base)
  )
}

/** Sums decimal money strings exactly. */
export function sumMoney(amounts: readonly string[]): string {
  return formatCents(amounts.reduce((sum, value) => sum + toCents(value), 0n))
}
