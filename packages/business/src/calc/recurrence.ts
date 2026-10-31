import type { DueRule } from "@workspace/domain"

export type { DueRule }

export function isDueOn(rule: DueRule, day: string): boolean {
  const [year, month, date] = day.split("-").map(Number)
  const at = new Date(Date.UTC(year, month - 1, date))

  if (rule.frequency === "Daily") {
    return true
  }

  if (rule.frequency === "Weekly") {
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

  return rule.frequency !== "Yearly" || rule.frequencyMonth === month
}

export function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number)

  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10)
}

export function daysInRange(from: string, to: string): string[] {
  const days: string[] = []

  for (let day = from; day <= to; day = shiftDay(day, 1)) {
    days.push(day)
  }

  return days
}

export function occurrencesBetween(
  rule: DueRule,
  from: string,
  to: string
): string[] {
  return daysInRange(from, to).filter((day) => isDueOn(rule, day))
}

const NEXT_OCCURRENCE_HORIZON_DAYS = 400

export function nextOccurrence(rule: DueRule, from: string): string | null {
  for (let offset = 0; offset <= NEXT_OCCURRENCE_HORIZON_DAYS; offset += 1) {
    const day = shiftDay(from, offset)

    if (isDueOn(rule, day)) {
      return day
    }
  }

  return null
}
