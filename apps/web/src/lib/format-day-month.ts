/**
 * Renders a month/day pair as the DAY / MONTH format — e.g. `"15 / 03"` —
 * the shape a credit card's close and due dates read as. Both parts are
 * numeric, so no locale decision is involved; an absent part is empty.
 */
export function formatDayMonth(
  day: number | null,
  month: number | null
): string {
  if (day === null || month === null) {
    return ''
  }

  return `${String(day).padStart(2, '0')} / ${String(month).padStart(2, '0')}`
}
