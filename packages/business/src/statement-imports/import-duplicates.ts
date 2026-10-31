import {
  IMPORT_DUPLICATE_DAYS,
  IMPORT_DUPLICATE_SIMILARITY,
  type TransactionType,
} from '@workspace/dto'

import { descriptionSimilarity, withinDays } from './statement-imports.js'

export interface ExistingRow {
  id: number
  name: string
  transactionDt: string
  amount: string
  type: TransactionType
}

export function indexByAmount(
  rows: readonly ExistingRow[]
): Map<string, ExistingRow[]> {
  const index = new Map<string, ExistingRow[]>()

  for (const row of rows) {
    const key = `${row.type}|${row.amount}`

    index.set(key, [...(index.get(key) ?? []), row])
  }

  return index
}

export function findProbableDuplicate(
  row: {
    name: string
    amount: string
    type: TransactionType
    transactionDt: string
  },
  index: ReadonlyMap<string, readonly ExistingRow[]>
): ExistingRow | undefined {
  let best: { score: number; row: ExistingRow } | undefined

  for (const candidate of index.get(`${row.type}|${row.amount}`) ?? []) {
    if (
      !withinDays(
        candidate.transactionDt,
        row.transactionDt,
        IMPORT_DUPLICATE_DAYS
      )
    ) {
      continue
    }

    const score = descriptionSimilarity(candidate.name, row.name)

    if (
      score >= IMPORT_DUPLICATE_SIMILARITY &&
      (best === undefined || score > best.score)
    ) {
      best = { score, row: candidate }
    }
  }

  return best?.row
}
