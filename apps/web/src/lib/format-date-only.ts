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

export function formatDateOnly(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDayLabel(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const date = parseDateOnly(value)

  return date === undefined
    ? value
    : new Intl.DateTimeFormat(locale, options).format(date)
}
