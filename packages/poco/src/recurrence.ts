import type { Frequency } from './recurring-transactions.js'

/**
 * Calendar arithmetic on `YYYY-MM-DD` days, shared by the recurring cron
 * (which materializes the days a rule is due), the forecast, and the
 * upcoming list. Every function works on a UTC midnight, so no time zone
 * offset or DST boundary can move a day.
 */

/** The shape of a rule the due check reads. */
export interface DueRule {
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
}

/**
 * Answers whether a rule is due on a day, as a pure function of the rule
 * and the `YYYY-MM-DD` day — no clock, no database.
 *
 * Daily is due every day. Weekly compares the ISO weekday (1–7, Monday is
 * 1). Monthly and Yearly compare the day of the month, clamped: a rule on
 * day 31 runs on the last day of a 30-day month, and a rule on February 29
 * runs on February 28 of a common year.
 */
export function isDueOn(rule: DueRule, day: string): boolean {
  const [year, month, date] = day.split('-').map(Number)
  const at = new Date(Date.UTC(year, month - 1, date))

  if (rule.frequency === 'Daily') {
    return true
  }

  if (rule.frequency === 'Weekly') {
    // JavaScript's Sunday-first weekday becomes the ISO Monday-first one.
    const isoWeekday = ((at.getUTCDay() + 6) % 7) + 1

    return rule.frequencyDay === isoWeekday
  }

  if (rule.frequencyDay === null) {
    return false
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const dueDay = Math.min(rule.frequencyDay, lastDay)

  if (date !== dueDay) {
    return false
  }

  return rule.frequency !== 'Yearly' || rule.frequencyMonth === month
}

/** Shifts a `YYYY-MM-DD` day by a number of days. */
export function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10)
}

/** Every day from `from` through `to`, inclusive, oldest first. */
export function daysInRange(from: string, to: string): string[] {
  const days: string[] = []

  for (let day = from; day <= to; day = shiftDay(day, 1)) {
    days.push(day)
  }

  return days
}

/** The days a rule is due on within `from` through `to`, inclusive. */
export function occurrencesBetween(
  rule: DueRule,
  from: string,
  to: string
): string[] {
  return daysInRange(from, to).filter((day) => isDueOn(rule, day))
}
