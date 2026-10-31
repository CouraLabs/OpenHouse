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
