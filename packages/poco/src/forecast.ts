import type { Currency } from './currencies.js'
import { formatCents, toCents } from './money.js'
import { occurrencesBetween, type DueRule } from './recurrence.js'
import type { RecurringTransaction } from './recurring-transactions.js'

/** What the forecast reads of a rule: when it fires, what it moves, where. */
export type ForecastRule = DueRule &
  Pick<RecurringTransaction, 'type' | 'amount' | 'linkedAccountId'>

/** One currency's expected expense total over a stretch of days. */
export interface ForecastSlice {
  currency: Currency
  total: string
}

/** One firing of a rule on a day. */
export interface ForecastOccurrence<T extends ForecastRule = ForecastRule> {
  date: string
  rule: T
}

/**
 * Every firing of the rules over `from` through `to` (`YYYY-MM-DD`,
 * inclusive), oldest day first. The math is the recurring cron's own
 * (`isDueOn`): a Daily rule fires every day, a Weekly rule on its ISO
 * weekday (Monday is 1), a Monthly rule on its day clamped into the month's
 * length (a day-31 rule runs on a month's last day), and a Yearly rule on
 * its day of its month. The horizon is arbitrary — a month, 30 days, a year.
 */
export function forecastOccurrences<T extends ForecastRule>(
  rules: readonly T[],
  from: string,
  to: string
): ForecastOccurrence<T>[] {
  const occurrences = rules.flatMap((rule) =>
    occurrencesBetween(rule, from, to).map((date) => ({ date, rule }))
  )

  // A stable sort: rules firing on one day keep the order they came in.
  return occurrences.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Totals the expenses the rules would generate over `from` through `to`,
 * per currency. The currency comes from the rule's account, matched by the
 * caller — a rule whose account is unknown is skipped rather than summed
 * under the wrong money.
 */
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

/**
 * The expectations card's number: the expenses the ACTIVE rules generate
 * over the calendar month `nextMonth` falls in.
 */
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
