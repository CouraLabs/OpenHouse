import type { Frequency } from "./recurring-transactions.js"

export interface DueRule {
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
}
