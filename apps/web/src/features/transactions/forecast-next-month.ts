import type { Currency, RecurringTransaction } from '@workspace/poco'

/** One currency's expected expense total for a month. */
export interface ForecastSlice {
  currency: Currency
  total: string
}

/**
 * Totals the expenses the ACTIVE rules would generate over a month, per
 * currency — the expectations card's number. The math mirrors what the
 * recurring cron materializes: a Daily rule fires once per day of the
 * month, a Weekly rule once per occurrence of its ISO weekday (Monday is
 * 1), a Monthly rule once on its day clamped into the month's length (a
 * day-31 rule runs on a month's last day), and a Yearly rule once when its
 * month is the month asked about. The currency comes from the rule's
 * account, matched by the caller — a rule whose account is unknown is
 * skipped rather than summed under the wrong money.
 */
export function forecastNextMonthExpenses(
  rules: RecurringTransaction[],
  nextMonth: Date,
  currencyOf: (accountId: number) => Currency | undefined
): ForecastSlice[] {
  const year = nextMonth.getFullYear()
  const month = nextMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // A weekday's occurrences in the month: the first one, then every seventh
  // day after it, whatever the weekday the month opens on.
  const weekdaysInMonth = new Map(
    Array.from({ length: 7 }, (_, index) => {
      const first = new Date(year, month, 1)
      // JavaScript's Sunday-first weekday becomes the ISO Monday-first one.
      const isoWeekday = ((first.getDay() + 6) % 7) + 1
      const offset = (index + 1 - isoWeekday + 7) % 7

      return [index + 1, Math.floor((daysInMonth - 1 - offset) / 7) + 1]
    })
  )

  const cents = new Map<Currency, bigint>()

  for (const rule of rules) {
    if (rule.type !== 'Expense') {
      continue
    }

    const currency = currencyOf(rule.linkedAccountId)

    if (currency === undefined) {
      continue
    }

    const occurrences = occurrencesOf(rule, {
      daysInMonth,
      weekdaysInMonth,
      month: month + 1,
    })

    if (occurrences === 0) {
      continue
    }

    const amount = rule.amount.split('.')
    const ruleCents =
      BigInt(`${amount[0]}${(amount[1] ?? '').padEnd(2, '0')}`) *
      BigInt(occurrences)

    cents.set(currency, (cents.get(currency) ?? 0n) + ruleCents)
  }

  return [...cents]
    .map(([currency, total]) => ({ currency, total: formatCents(total) }))
    .sort((a, b) => (a.currency < b.currency ? -1 : 1))
}

/** How many times a rule fires in the month the windows describe. */
function occurrencesOf(
  rule: Pick<
    RecurringTransaction,
    'frequency' | 'frequencyDay' | 'frequencyMonth'
  >,
  month: {
    daysInMonth: number
    weekdaysInMonth: Map<number, number>
    /** The month asked about, as 1–12. */
    month: number
  }
): number {
  if (rule.frequency === 'Daily') {
    return month.daysInMonth
  }

  if (rule.frequency === 'Weekly') {
    return rule.frequencyDay === null
      ? 0
      : (month.weekdaysInMonth.get(rule.frequencyDay) ?? 0)
  }

  if (rule.frequency === 'Yearly') {
    return rule.frequencyMonth === month.month ? 1 : 0
  }

  // Monthly fires once: its day clamps into the month's length, exactly as
  // the cron materializes it.
  return 1
}

/** Renders cents as the decimal money string the wire carries. */
function formatCents(total: bigint): string {
  const sign = total < 0n ? '-' : ''
  const digits = (total < 0n ? -total : total).toString().padStart(3, '0')

  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`
}
