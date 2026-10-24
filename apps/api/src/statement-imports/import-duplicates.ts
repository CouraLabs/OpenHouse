import {
  descriptionSimilarity,
  IMPORT_DUPLICATE_DAYS,
  IMPORT_DUPLICATE_SIMILARITY,
  withinDays,
  type TransactionType,
} from '@workspace/poco'

/** A stored transaction an imported row may repeat. */
export interface ExistingRow {
  id: number
  name: string
  transactionDt: string
  amount: string
  type: TransactionType
}

/** Groups the stored rows by direction and amount, so a probable-duplicate
 * check only compares rows that already agree on the money. */
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

/**
 * Finds the stored row an imported one probably repeats: the same account
 * (the caller's index), the same direction and amount, a day within ±2 days,
 * and a description similar enough (lowercase, no digits or accents). The
 * most similar candidate wins. The row is flagged, never skipped — the user
 * decides.
 */
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
