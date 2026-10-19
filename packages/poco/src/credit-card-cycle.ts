/**
 * The credit card billing cycle: which bill a purchase on a day lands on.
 * One rule, shared by the API (which assigns every card transaction to a
 * statement) and the web form (which previews "Billed on …" without a
 * round-trip). Every date is a `YYYY-MM-DD` string and every computation
 * runs on UTC calendar days — never on a `Date` in the device's zone.
 */

/** The cycle fields of a credit card account. */
export interface CardCycle {
  /** The day of the month the bill closes, 1–31 (clamped to short months). */
  closeDay: number
  /** The day of the month the bill is due, 1–31 (clamped to short months). */
  dueDay: number
  /** Whether a purchase on the close day still lands on the closing bill.
   * Off by default: most banks put it on the next bill ("best day"). */
  closeDayInclusive: boolean
}

/**
 * One cycle of one card. The period is `[periodStart, closeDate)`: the start
 * inclusive, the close date the exclusive end — the close day itself on a
 * default card, the day after it on a `closeDayInclusive` card. The next
 * cycle's `periodStart` is this one's `closeDate`, so periods never overlap
 * and never leave a gap.
 */
export interface StatementWindow {
  periodStart: string
  closeDate: string
  dueDate: string
}

/** A gap between close and due outside this range usually means the two
 * days were entered swapped: the account form warns, never refuses. */
export const CYCLE_GAP_MIN_DAYS = 5
export const CYCLE_GAP_MAX_DAYS = 25

/**
 * The statement a purchase on `transactionDt` lands on, `offset` cycles
 * later (installment `k` of a purchase lands on offset `k − 1`). Offsetting
 * cycles — never shifting the purchase date month by month — is what keeps
 * a close day of 30 from skipping February.
 */
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
  // Due in the close's own month when the due day comes after the close
  // day; otherwise the month after. Never before the period ends — a short
  // month can clamp an inclusive card's due day onto its close day.
  const dueMonth = cycle.dueDay > cycle.closeDay ? month : addMonths(month, 1)
  const dueDate = clampDay(dueMonth, cycle.dueDay)

  return {
    periodStart: cycleEnd(cycle, addMonths(month, -1)),
    closeDate,
    dueDate: dueDate < closeDate ? closeDate : dueDate,
  }
}

/** The bank's close day of a window — what a bill displays as "closes on".
 * On an inclusive card the period ends the day after it. */
export function displayCloseDate(
  cycle: Pick<CardCycle, 'closeDayInclusive'>,
  window: Pick<StatementWindow, 'closeDate'>
): string {
  return cycle.closeDayInclusive
    ? addDays(window.closeDate, -1)
    : window.closeDate
}

/** A card's cycle, or nothing while its close or due day is unset (a card
 * created before both were required). */
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

/** Whether a card's close and due days differ — a bill closing and falling
 * due on the same day cannot be paid after it is known. */
export function cycleDaysDiffer(closeDay: number, dueDay: number): boolean {
  return closeDay !== dueDay
}

/** The days from a card's close to its due day, over a 30-day month. */
export function cycleGapDays(closeDay: number, dueDay: number): number {
  return dueDay > closeDay ? dueDay - closeDay : dueDay + 30 - closeDay
}

/** Whether a close/due pair looks swapped: too short or too long a gap. */
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

/** A `YYYY-MM-DD` day moved by `days` calendar days. */
export function addDays(day: string, days: number): string {
  const { y, m, d } = parseDay(day)

  return formatUtc(new Date(Date.UTC(y, m - 1, d + days)))
}

/** The whole days from `from` to `to` — negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from)
  const b = parseDay(to)

  return (
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000
  )
}

interface YearMonth {
  y: number
  /** 1–12. */
  m: number
}

/** The exclusive end of the cycle that nominally closes in `month`. */
function cycleEnd(cycle: CardCycle, month: YearMonth): string {
  const close = clampDay(month, cycle.closeDay)

  return cycle.closeDayInclusive ? addDays(close, 1) : close
}

/** `day` of `month`, capped at the month's last day. */
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
