import type { Currency, Transaction } from '@workspace/poco'

/** One currency's slice of a day's totals. A day that spans accounts of
 * two currencies totals each separately — currencies are never summed
 * together. */
export interface DayTotal {
  currency: Currency
  incomes: string
  expenses: string
  net: string
}

/** The rows of one day: the day itself and everything that happened on it. */
export interface DayGroup {
  /** The day, as `YYYY-MM-DD`. */
  day: string
  transactions: Transaction[]
  /** The day's totals, one entry per currency the day's rows carry,
   * richest first — a single-currency day answers one entry. */
  totals: DayTotal[]
}

/** Groups consecutive rows by day, newest first, totaling each day. The
 * totals never count the two sides of a transfer — the pair books the same
 * money once as an expense and once as an income — nor a Canceled row:
 * money that did not move is not money spent. Rows of different currencies
 * total separately, one entry per currency. */
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
        transaction.status === 'Canceled'
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

/** Reads a decimal money string into BigInt cents. */
function toCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value)

  if (match === null) {
    return 0n
  }

  const [, whole, fraction = ''] = match

  return BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))
}

/** Formats BigInt cents back into the two-decimal string the rows carry. */
function formatCents(cents: bigint): string {
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${cents < 0n ? '-' : ''}${whole}.${fraction}`
}
