import type { LimitType } from '@workspace/poco'

/**
 * The window a limit's period covers, as inclusive `YYYY-MM-DD` ends — the
 * days the usage route totals expenses over. A Daily limit covers its own
 * day, a Weekly limit the Monday-based week (the ISO weekday the recurring
 * rules speak), a Monthly limit the calendar month, a Yearly limit the
 * calendar year — all anchored on `today`, the tenant's calendar day
 * (`todayIn(settings.timezone)`), never the server's.
 *
 * The arithmetic runs on UTC midnights, so no offset or DST boundary of the
 * process's own zone can move a day.
 */
export function periodWindow(
  type: LimitType,
  today: string
): { from: string; to: string } {
  const [year, month, day] = today.split('-').map(Number)

  if (type === 'Daily') {
    return { from: today, to: today }
  }

  if (type === 'Weekly') {
    // JavaScript's Sunday-first weekday becomes the ISO Monday-first one.
    const weekday =
      (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7

    return {
      from: dayOnly(year, month - 1, day - weekday),
      to: dayOnly(year, month - 1, day - weekday + 6),
    }
  }

  if (type === 'Monthly') {
    return {
      from: dayOnly(year, month - 1, 1),
      to: dayOnly(year, month, 0),
    }
  }

  return { from: dayOnly(year, 0, 1), to: dayOnly(year, 11, 31) }
}

/** A UTC calendar day as `YYYY-MM-DD` — the shape the `date` columns store.
 * Out-of-range parts roll over the way `Date.UTC` rolls them. */
function dayOnly(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10)
}
