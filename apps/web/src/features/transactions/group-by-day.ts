import type { Currency, Transaction } from '@workspace/poco'

export interface DayTotal {
  currency: Currency
  incomes: string
  expenses: string
  net: string
}

export interface DayGroup {
  day: string
  transactions: Transaction[]
  totals: DayTotal[]
}

export function groupByDay(rows: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []

  for (const transaction of rows) {
    const last = groups[groups.length - 1]

    if (last === undefined || last.day !== transaction.transactionDt) {
      groups.push({
        day: transaction.transactionDt,
        transactions: [transaction],
        totals: [],
      })

      continue
    }

    last.transactions.push(transaction)
  }

  for (const group of groups) {
    const totals = new Map<Currency, { incomes: bigint; expenses: bigint }>()

    for (const transaction of group.transactions) {
      if (
        transaction.transferGroupId !== null ||
        transaction.status === 'Canceled' ||
        transaction.isAdjustment
      ) {
        continue
      }

      const total = totals.get(transaction.currency) ?? {
        incomes: 0n,
        expenses: 0n,
      }

      if (transaction.type === 'Income') {
        total.incomes += toCents(transaction.amount)
      } else {
        total.expenses += toCents(transaction.amount)
      }

      totals.set(transaction.currency, total)
    }

    group.totals = [...totals.entries()].map(([currency, total]) => ({
      currency,
      incomes: formatCents(total.incomes),
      expenses: formatCents(total.expenses),
      net: formatCents(total.incomes - total.expenses),
    }))
  }

  return groups
}

function toCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value)

  if (match === null) {
    return 0n
  }

  const [, whole, fraction = ''] = match

  return BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))
}

function formatCents(cents: bigint): string {
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${cents < 0n ? '-' : ''}${whole}.${fraction}`
}
