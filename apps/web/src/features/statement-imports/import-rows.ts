import type { ImportCommitRow, ImportPreviewRow } from '@workspace/dto'

export interface RowEdit {
  selected?: boolean
  categoryId?: number | null
  receiverId?: number | null
  linked?: boolean
}

export interface ResolvedRow {
  row: ImportPreviewRow
  selected: boolean
  categoryId: number | null
  receiverId: number | null
  linked: boolean
}

export function isSelectedByDefault(row: ImportPreviewRow): boolean {
  return !row.billPayment && row.duplicate?.kind !== 'external'
}

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

export function missingCategoryCount(rows: readonly ResolvedRow[]): number {
  return rows.filter((entry) => entry.selected && entry.categoryId === null)
    .length
}

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
