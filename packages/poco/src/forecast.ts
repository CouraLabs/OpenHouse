import type { Currency } from './currencies.js'
import { formatCents, toCents } from './money.js'
import { occurrencesBetween, type DueRule } from './recurrence.js'
import type { RecurringTransaction } from './recurring-transactions.js'

export type ForecastRule = DueRule &
  Pick<RecurringTransaction, 'type' | 'amount' | 'linkedAccountId'>

export interface ForecastSlice {
  currency: Currency
  total: string
}

export interface ForecastOccurrence<T extends ForecastRule = ForecastRule> {
  date: string
  rule: T
}

export function forecastOccurrences<T extends ForecastRule>(
  rules: readonly T[],
  from: string,
  to: string
): ForecastOccurrence<T>[] {
  const occurrences = rules.flatMap((rule) =>
    occurrencesBetween(rule, from, to).map((date) => ({ date, rule }))
  )

  return occurrences.sort((a, b) => a.date.localeCompare(b.date))
}

export function forecastExpenses(
  rules: readonly ForecastRule[],
  from: string,
  to: string,
  currencyOf: (accountId: number) => Currency | undefined
): ForecastSlice[] {
  const cents = new Map<Currency, bigint>()

  for (const { rule } of forecastOccurrences(
    rules.filter((candidate) => candidate.type === 'Expense'),
    from,
    to
  )) {
    const currency = currencyOf(rule.linkedAccountId)

    if (currency === undefined) {
      continue
    }

    cents.set(currency, (cents.get(currency) ?? 0n) + toCents(rule.amount))
  }

  return [...cents]
    .map(([currency, total]) => ({ currency, total: formatCents(total) }))
    .sort((a, b) => (a.currency < b.currency ? -1 : 1))
}

export function forecastNextMonthExpenses(
  rules: readonly ForecastRule[],
  nextMonth: Date,
  currencyOf: (accountId: number) => Currency | undefined
): ForecastSlice[] {
  const year = nextMonth.getFullYear()
  const month = nextMonth.getMonth()
  const pad = (value: number) => String(value).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  const prefix = `${year}-${pad(month + 1)}`

  return forecastExpenses(
    rules,
    `${prefix}-01`,
    `${prefix}-${pad(lastDay)}`,
    currencyOf
  )
}
