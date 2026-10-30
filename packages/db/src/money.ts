import { customType } from 'drizzle-orm/sqlite-core'

export const MAX_MONEY_CENTS = 2 ** 53 - 1

const DECIMAL_SHAPE = /^(-)?(\d+)(?:\.(\d{1,2}))?$/

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
