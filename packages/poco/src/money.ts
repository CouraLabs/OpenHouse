export function toCents(value: string): bigint {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(value)

  if (match === null) {
    throw new Error(`"${value}" is not a decimal money string.`)
  }

  const [, sign, whole, fraction = ''] = match
  const cents = BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))

  return sign === undefined ? cents : -cents
}

export function formatCents(cents: bigint): string {
  const sign = cents < 0n ? '-' : ''
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${sign}${whole}.${fraction}`
}

export function addMoney(a: string, b: string): string {
  return formatCents(toCents(a) + toCents(b))
}

export function negateMoney(a: string): string {
  return formatCents(-toCents(a))
}

export function isZeroMoney(amount: string): boolean {
  return toCents(amount) === 0n
}

export function compareMoney(a: string, b: string): -1 | 0 | 1 {
  const left = toCents(a)
  const right = toCents(b)

  if (left < right) {
    return -1
  }

  return left > right ? 1 : 0
}

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

export function sumMoney(amounts: readonly string[]): string {
  return formatCents(amounts.reduce((sum, value) => sum + toCents(value), 0n))
}
