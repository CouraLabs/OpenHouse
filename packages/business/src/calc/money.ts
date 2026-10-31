import { formatCents, toCents, type MoneyTone } from "@workspace/domain"

export { formatCents, toCents, type MoneyTone }

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

export function moneyTone(amount: string): MoneyTone {
  const cmp = compareMoney(amount, "0")

  if (cmp > 0) {
    return "positive"
  }

  return cmp < 0 ? "negative" : "zero"
}

export function splitInstallments(
  amount: string,
  count: number,
  mode: "total" | "perInstallment"
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`${count} is not an installment count.`)
  }

  if (mode === "perInstallment") {
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
