import type { LimitType } from '@workspace/poco'

/**
 * The window a limit's period covers, as inclusive `YYYY-MM-DD` ends — the
 * days the usage route totals expenses over. A Daily limit covers its own
 * day, a Weekly limit the Monday-based week (the ISO weekday the recurring
 * rules speak), a Monthly limit the calendar month, a Yearly limit the
 * calendar year — all anchored on the day the question is asked.
 */
export function periodWindow(
  type: LimitType,
  now: Date
): { from: string; to: string } {
  const year = now.getFullYear()
  const month = now.getMonth()

  if (type === 'Daily') {
    return { from: dayOnly(now), to: dayOnly(now) }
  }

  if (type === 'Weekly') {
    // JavaScript's Sunday-first weekday becomes the ISO Monday-first one.
    const weekday = (now.getDay() + 6) % 7
    const start = new Date(year, month, now.getDate() - weekday)
    const end = new Date(year, month, now.getDate() - weekday + 6)

    return { from: dayOnly(start), to: dayOnly(end) }
  }

  if (type === 'Monthly') {
    return {
      from: dayOnly(new Date(year, month, 1)),
      to: dayOnly(new Date(year, month + 1, 0)),
    }
  }

  return {
    from: dayOnly(new Date(year, 0, 1)),
    to: dayOnly(new Date(year, 11, 31)),
  }
}

/** A local date as `YYYY-MM-DD` — the shape the `date` columns store. */
function dayOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
