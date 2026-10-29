/**
 * Money storage for SQLite.
 *
 * SQLite has no `numeric`, so money is stored as **integer minor units**
 * (cents): every currency the app holds (BRL, USD, EUR) has two decimals,
 * and an integer column keeps `SUM` exact — nothing crosses a float.
 *
 * The wire and poco still carry decimal strings ("12.34", rule 6b); only
 * storage changes, through this one custom type. The conversion goes through
 * `BigInt` and string slicing — never `Number(x) * 100`, which loses cents
 * on values like "0.29" (0.29 * 100 === 28.99999…). The string shape matches
 * poco's money grammar exactly (an optional sign, digits, and 0–2 decimals),
 * so a value that validates on the wire converts here.
 *
 * The database is the ledger of record, so a value that cannot round-trip
 * exactly (more decimals than the currencies have, or a magnitude above
 * 2^53 cents where the `number` driverData stops being exact) is rejected
 * instead of silently rounded.
 */

import { customType } from 'drizzle-orm/sqlite-core'

/** The largest magnitude the converter accepts, as cents. Above 2^53 − 1 a
 * `number` stops being exact, so the integer arithmetic could drift. */
export const MAX_MONEY_CENTS = 2 ** 53 - 1

/**
 * The decimal shape the app carries: an optional sign, digits, and 0–2
 * decimals — the same grammar poco's `toCents` accepts. Values with more
 * precision ("12.345") are rejected, not truncated.
 */
const DECIMAL_SHAPE = /^(-)?(\d+)(?:\.(\d{1,2}))?$/

/**
 * Converts a decimal string ("12.34", "-0.01", "12") to integer cents.
 * Throws when the string is not money or exceeds the exact range — a bad
 * value must stop the write, not round away money.
 */
export function decimalToCents(value: string): number {
  const match = DECIMAL_SHAPE.exec(value)

  if (match === null) {
    throw new Error(`"${value}" is not a decimal money string.`)
  }

  const [, sign, whole, fraction = ''] = match
  const cents = BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))

  if (cents > BigInt(MAX_MONEY_CENTS) || cents < BigInt(-MAX_MONEY_CENTS)) {
    throw new Error(`"${value}" exceeds the exact money range (±2^53 cents).`)
  }

  return sign === undefined ? Number(cents) : -Number(cents)
}

/**
 * Converts integer cents back to the decimal string the wire carries. The
 * integer arithmetic keeps every value exact; `0` answers `"0.00"`, never
 * `"-0.00"`.
 */
export function centsToDecimal(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Money storage must hold integer cents, got ${cents}.`)
  }

  const sign = cents < 0 ? '-' : ''
  const magnitude = String(Math.abs(cents)).padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${sign}${whole}.${fraction}`
}

/**
 * The column type every money column uses: the database stores integer
 * cents, TypeScript and the wire carry the decimal string. Raw SQL writes
 * cents directly (`balance + ?`); raw SQL reads format back through
 * `centsToDecimal`.
 */
export const money = customType<{ data: string; driverData: number }>({
  dataType() {
    return 'integer'
  },
  toDriver(value: string) {
    return decimalToCents(value)
  },
  fromDriver(value: number) {
    return centsToDecimal(value)
  },
})
