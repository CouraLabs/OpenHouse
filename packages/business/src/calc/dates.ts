export function addDays(day: string, days: number): string {
  const { y, m, d } = parseDay(day)

  return formatUtc(new Date(Date.UTC(y, m - 1, d + days)))
}

export function daysBetween(from: string, to: string): number {
  const a = parseDay(from)
  const b = parseDay(to)

  return (
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000
  )
}

function parseDay(day: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)

  if (match === null) {
    throw new Error(`"${day}" is not a YYYY-MM-DD day.`)
  }

  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function formatUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}
