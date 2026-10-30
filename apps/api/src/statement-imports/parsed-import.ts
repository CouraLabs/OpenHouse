import type { ImportInvalidLine, TransactionType } from '@workspace/poco'

export interface ParsedImportRow {
  name: string
  note: string | null
  amount: string
  type: TransactionType
  transactionDt: string
  externalId: string | null
  pending: boolean
  categoryText: string | null
  paymentHint: boolean
}

export interface ParsedImport {
  rows: ParsedImportRow[]
  invalidCount: number
  invalid: ImportInvalidLine[]
}

export const INVALID_LINES_SHOWN = 50
