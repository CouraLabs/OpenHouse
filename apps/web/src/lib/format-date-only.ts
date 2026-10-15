/**
 * The local-day conversions between the `YYYY-MM-DD` wire shape the goal
 * routes carry and the `Date` the picker works with. Both directions pin to
 * the browser's local day, so a date never shifts across a timezone.
 */

/** Parses a `YYYY-MM-DD` wire date into a local-day `Date`, or nothing when
 * the value is absent or malformed. */
export function parseDateOnly(
  value: string | null | undefined
): Date | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const [year, month, day] = value.split('-').map(Number)

  return year === undefined ||
    month === undefined ||
    day === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
    ? undefined
    : new Date(year, month - 1, day)
}

/** Formats a `Date` as the `YYYY-MM-DD` wire shape, pinned to the day the
 * browser holds it in. */
export function formatDateOnly(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
