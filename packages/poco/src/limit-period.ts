import type { LimitType } from './limits.js'

export function periodWindow(
  type: LimitType,
  today: string
): { from: string; to: string } {
  const [year, month, day] = today.split('-').map(Number)

  if (type === 'Daily') {
    return { from: today, to: today }
  }

  if (type === 'Weekly') {
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

function dayOnly(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10)
}
