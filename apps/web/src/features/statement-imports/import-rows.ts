import type { ImportCommitRow, ImportPreviewRow } from '@workspace/poco'

/** What the user changed on one preview row; unset fields keep the default. */
export interface RowEdit {
  selected?: boolean
  categoryId?: number | null
  receiverId?: number | null
  linked?: boolean
}

/** A preview row with the user's edits and the defaults folded in. */
export interface ResolvedRow {
  row: ImportPreviewRow
  selected: boolean
  categoryId: number | null
  receiverId: number | null
  /** Whether the row is linked as an installment of its marker. */
  linked: boolean
}

/**
 * Whether a row is ticked before the user touches it: a bill payment is
 * skipped (the payment already exists as a transfer from the paying account)
 * and so is a row whose bank id was imported before. A probable duplicate
 * stays ticked — it is flagged for the user to decide, never skipped.
 */
export function isSelectedByDefault(row: ImportPreviewRow): boolean {
  return !row.billPayment && row.duplicate?.kind !== 'external'
}

/** Folds the edits and defaults into each row. The category is the edit,
 * else the suggestion, else the page's fallback category. */
export function resolveRows(
  rows: readonly ImportPreviewRow[],
  edits: Readonly<Record<number, RowEdit>>,
  fallbackCategoryId: number | null
): ResolvedRow[] {
  return rows.map((row) => {
    const edit = edits[row.index] ?? {}

    return {
      row,
      selected: edit.selected ?? isSelectedByDefault(row),
      categoryId:
        edit.categoryId !== undefined
          ? edit.categoryId
          : (row.categoryId ?? fallbackCategoryId),
      receiverId:
        edit.receiverId !== undefined ? edit.receiverId : row.receiverId,
      linked: row.installment !== null && (edit.linked ?? true),
    }
  })
}

/** How many ticked rows still have no category — the commit waits for them. */
export function missingCategoryCount(rows: readonly ResolvedRow[]): number {
  return rows.filter((entry) => entry.selected && entry.categoryId === null)
    .length
}

/** The commit rows of the ticked ones. A pending row imports as Verify, a
 * posted one as Checked. The caller checked every ticked row has a
 * category. */
export function toCommitRows(rows: readonly ResolvedRow[]): ImportCommitRow[] {
  return rows
    .filter(
      (entry): entry is ResolvedRow & { categoryId: number } =>
        entry.selected && entry.categoryId !== null
    )
    .map(({ row, categoryId, receiverId, linked }) => ({
      name: row.name,
      amount: row.amount,
      type: row.type,
      transactionDt: row.transactionDt,
      categoryId,
      receiverId,
      externalId: row.externalId,
      status: row.pending ? 'Verify' : 'Checked',
      installment: linked ? row.installment : null,
    }))
}
