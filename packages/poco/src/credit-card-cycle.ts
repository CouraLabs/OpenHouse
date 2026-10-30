export interface CardCycle {
  closeDay: number
  dueDay: number
  closeDayInclusive: boolean
}

export interface StatementWindow {
  periodStart: string
  closeDate: string
  dueDate: string
}

export const CYCLE_GAP_MIN_DAYS = 5
export const CYCLE_GAP_MAX_DAYS = 25

export function resolveStatement(
  cycle: CardCycle,
  transactionDt: string,
  offset = 0
): StatementWindow {
  const day = parseDay(transactionDt)
  let month = { y: day.y, m: day.m }

  if (transactionDt >= cycleEnd(cycle, month)) {
    month = addMonths(month, 1)
  }

  month = addMonths(month, offset)

  const closeDate = cycleEnd(cycle, month)
  const dueMonth = cycle.dueDay > cycle.closeDay ? month : addMonths(month, 1)
  const dueDate = clampDay(dueMonth, cycle.dueDay)

  return {
    periodStart: cycleEnd(cycle, addMonths(month, -1)),
    closeDate,
    dueDate: dueDate < closeDate ? closeDate : dueDate,
  }
}

export function displayCloseDate(
  cycle: Pick<CardCycle, 'closeDayInclusive'>,
  window: Pick<StatementWindow, 'closeDate'>
): string {
  return cycle.closeDayInclusive
    ? addDays(window.closeDate, -1)
    : window.closeDate
}

export function cardCycleOf(card: {
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
}): CardCycle | null {
  if (card.closeDay === null || card.dueDay === null) {
    return null
  }

  return {
    closeDay: card.closeDay,
    dueDay: card.dueDay,
    closeDayInclusive: card.closeDayInclusive,
  }
}

export function cycleDaysDiffer(closeDay: number, dueDay: number): boolean {
  return closeDay !== dueDay
}

export function cycleGapDays(closeDay: number, dueDay: number): number {
  return dueDay > closeDay ? dueDay - closeDay : dueDay + 30 - closeDay
}

export function cycleGapWarning(
  closeDay: number,
  dueDay: number
): 'short' | 'long' | null {
  const gap = cycleGapDays(closeDay, dueDay)

  if (gap < CYCLE_GAP_MIN_DAYS) {
    return 'short'
  }

  return gap > CYCLE_GAP_MAX_DAYS ? 'long' : null
}

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

interface YearMonth {
  y: number
  m: number
}

function cycleEnd(cycle: CardCycle, month: YearMonth): string {
  const close = clampDay(month, cycle.closeDay)

  return cycle.closeDayInclusive ? addDays(close, 1) : close
}

function clampDay(month: YearMonth, day: number): string {
  const last = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate()

  return formatUtc(
    new Date(Date.UTC(month.y, month.m - 1, Math.min(day, last)))
  )
}

function addMonths(month: YearMonth, months: number): YearMonth {
  const index = month.y * 12 + (month.m - 1) + months

  return { y: Math.floor(index / 12), m: (index % 12) + 1 }
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
