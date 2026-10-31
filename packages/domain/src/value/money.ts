export const MAX_MONEY_CENTS = 2 ** 53 - 1

export type MoneyTone = 'positive' | 'negative' | 'zero'

export const DECIMAL_MONEY_SHAPE = /^(-)?(\d+)(?:\.(\d{1,2}))?$/

export const toCents = (value: string): bigint => {
  const match = DECIMAL_MONEY_SHAPE.exec(value)

  if (match === null) {
    throw new Error(`"${value}" is not a decimal money string.`)
  }

  const [, sign, whole, fraction = ''] = match
  const cents = BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))

  return sign === undefined ? cents : -cents
}

export const formatCents = (cents: bigint): string => {
  const sign = cents < 0n ? '-' : ''
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${sign}${whole}.${fraction}`
}

export const decimalToCents = (value: string): number => {
  const cents = toCents(value)

  if (cents > BigInt(MAX_MONEY_CENTS) || cents < BigInt(-MAX_MONEY_CENTS)) {
    throw new Error(`"${value}" exceeds the exact money range (±2^53 cents).`)
  }

  return cents === 0n ? 0 : Number(cents)
}

export const centsToDecimal = (cents: number): string => {
  if (!Number.isInteger(cents)) {
    throw new Error(`Money storage must hold integer cents, got ${cents}.`)
  }

  return formatCents(BigInt(cents))
}
