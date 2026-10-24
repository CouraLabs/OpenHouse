import type { ImportInvalidLine, TransactionType } from '@workspace/poco'

/**
 * One row of a bank file after parsing, before anything is matched against
 * the tenant's data: the same shape whether it came from an OFX or a CSV.
 * The amount is a positive money string and the direction lives in `type`.
 */
export interface ParsedImportRow {
  name: string
  note: string | null
  amount: string
  type: TransactionType
  transactionDt: string
  /** The bank's own id (OFX `FITID`), or nothing. */
  externalId: string | null
  /** A CSV row the bank still lists as pending: it imports as Verify. */
  pending: boolean
  /** The category the file itself names (a CSV category column). */
  categoryText: string | null
  /** The OFX `TRNTYPE` said PAYMENT — a card bill payment hint. */
  paymentHint: boolean
}

/** What reading a file produced: its rows and the lines it could not read. */
export interface ParsedImport {
  rows: ParsedImportRow[]
  invalidCount: number
  /** The first unreadable lines, capped. */
  invalid: ImportInvalidLine[]
}

/** How many unreadable lines the answer lists. */
export const INVALID_LINES_SHOWN = 50
