import type { Currency } from "./currencies.js"
import type { TransactionType } from "./transactions.js"

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024

export const IMPORT_COMMIT_MAX_BYTES = 2 * 1024 * 1024

export const IMPORT_MAX_ROWS = 5000

export const IMPORT_CHUNK_SIZE = 500

export const IMPORT_UNDO_HOURS = 24

export const importFileExtensions = [".ofx", ".qfx", ".csv"] as const

export const IMPORT_DUPLICATE_DAYS = 2

export const IMPORT_DUPLICATE_SIMILARITY = 0.6

export const importFormats = ["ofx", "csv"] as const

export type ImportFormat = (typeof importFormats)[number]

export const importDateFormats = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
] as const

export type ImportDateFormat = (typeof importDateFormats)[number]

export const importDecimalSeparators = [",", "."] as const

export type ImportDecimalSeparator = (typeof importDecimalSeparators)[number]

export const importSignConventions = [
  "negativeIsExpense",
  "positiveIsExpense",
] as const

export type ImportSignConvention = (typeof importSignConventions)[number]

export const importEncodings = ["auto", "utf-8", "windows-1252"] as const

export type ImportEncoding = (typeof importEncodings)[number]

export const importDelimiters = ["auto", ",", ";", "\t"] as const

export type ImportDelimiter = (typeof importDelimiters)[number]

export type ImportMapping = {
  hasHeader: boolean
  dateColumn: number
  descriptionColumn: number
  amountColumn?: number | null | undefined
  debitColumn?: number | null | undefined
  creditColumn?: number | null | undefined
  categoryColumn?: number | null | undefined
  pendingColumn?: number | null | undefined
  dateFormat: ImportDateFormat
  decimalSeparator: ImportDecimalSeparator
  signConvention: ImportSignConvention
  encoding: ImportEncoding
  delimiter: ImportDelimiter
}

export type ImportInstallment = {
  count: number
  number: number
}

export type ImportDuplicate = {
  kind: "external" | "probable"
  transactionId: number
  name: string
  transactionDt: string
  amount: string
}

export type ImportSuggestionSource = "file" | "linker" | "inferred"

export type ImportStatementWindow = {
  periodStart: string
  closeDate: string
  dueDate: string
}

export type ImportPreviewRow = {
  index: number
  name: string
  amount: string
  type: TransactionType
  transactionDt: string
  externalId: string | null
  pending: boolean
  categoryId: number | null
  categoryName: string | null
  receiverId: number | null
  receiverName: string | null
  suggestionSource: ImportSuggestionSource | null
  duplicate: ImportDuplicate | null
  billPayment: boolean
  statement: ImportStatementWindow | null
  installment: ImportInstallment | null
}

export type ImportInvalidLine = {
  line: number
  reason: "date" | "amount" | "description"
}

export type ImportPreview = {
  format: ImportFormat
  currency: Currency | null
  encoding: Exclude<ImportEncoding, "auto">
  isCard: boolean
  needsMapping: boolean
  headers: string[]
  sample: string[][]
  mapping: ImportMapping | null
  rows: ImportPreviewRow[]
  invalidCount: number
  invalid: ImportInvalidLine[]
}

export type ImportResult = {
  batchId: string | null
  imported: number
  skippedDuplicates: number
  undoUntil: string | null
}

export type ImportBatch = {
  batchId: string
  accountId: number
  count: number
  importedAt: string
  undoUntil: string
}

export type ImportUndoResult = {
  undone: number
}

export type InstallmentMarker = ImportInstallment & {
  merchant: string
}
