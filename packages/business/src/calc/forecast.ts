import {
  formatCents,
  toCents,
  type Currency,
  type ForecastOccurrence,
  type ForecastRule,
  type ForecastSlice,
} from "@workspace/domain"
import { occurrencesBetween } from "./recurrence.js"

export type { ForecastOccurrence, ForecastRule, ForecastSlice }

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
    rules.filter((candidate) => candidate.type === "Expense"),
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
  const pad = (value: number) => String(value).padStart(2, "0")
  const lastDay = new Date(year, month + 1, 0).getDate()
  const prefix = `${year}-${pad(month + 1)}`

  return forecastExpenses(
    rules,
    `${prefix}-01`,
    `${prefix}-${pad(lastDay)}`,
    currencyOf
  )
}
