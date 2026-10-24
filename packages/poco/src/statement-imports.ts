import { z } from 'zod'

import type { Currency } from './currencies.js'
import { dateOnlySchema } from './goals.js'
import { amountSchema } from './limits.js'
import { formatCents, toCents } from './money.js'
import {
  MAX_INSTALLMENTS,
  transactionTypeSchema,
  type TransactionType,
} from './transactions.js'

/**
 * The statement import contract: a bank file (OFX or CSV) uploaded on an
 * account is parsed server-side into a preview, the user edits the rows, and
 * the commit inserts them in one database transaction. The session names the
 * tenant — no body or query ever does. Money stays a string end to end; the
 * pure helpers here (amount, date, installment marker, similarity) are shared
 * by the API's parsers and its specs.
 */

/** The largest file an import accepts, in bytes. */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024

/** The largest JSON body a commit accepts, in bytes: 5,000 rows with room
 * to spare. */
export const IMPORT_COMMIT_MAX_BYTES = 2 * 1024 * 1024

/** The most rows one import reads and commits. */
export const IMPORT_MAX_ROWS = 5000

/** How many rows one commit inserts per statement batch, inside the same
 * database transaction. */
export const IMPORT_CHUNK_SIZE = 500

/** How long after an import its batch can still be undone. */
export const IMPORT_UNDO_HOURS = 24

/** The file extensions an import accepts. */
export const importFileExtensions = ['.ofx', '.qfx', '.csv'] as const

/** Two CSV rows are a probable duplicate when their dates are at most this
 * many days apart. */
export const IMPORT_DUPLICATE_DAYS = 2

/** The description similarity (0–1) from which a CSV row counts as a
 * probable duplicate of an existing one on the same amount and window. */
export const IMPORT_DUPLICATE_SIMILARITY = 0.6

export const importFormats = ['ofx', 'csv'] as const

export type ImportFormat = (typeof importFormats)[number]

/** The date formats a CSV column can be written in. */
export const importDateFormats = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
] as const

export const importDateFormatSchema = z.enum(importDateFormats, {
  error: 'Pick the date format.',
})

export type ImportDateFormat = (typeof importDateFormats)[number]

/** The decimal separator of a CSV amount: `,` (1.234,56) or `.` (1,234.56). */
export const importDecimalSeparators = [',', '.'] as const

export const importDecimalSeparatorSchema = z.enum(importDecimalSeparators, {
  error: 'Pick the decimal separator.',
})

export type ImportDecimalSeparator = (typeof importDecimalSeparators)[number]

/** Which sign of a single amount column is a spending: the usual bank
 * export writes charges negative; a card export often writes them positive. */
export const importSignConventions = [
  'negativeIsExpense',
  'positiveIsExpense',
] as const

export const importSignConventionSchema = z.enum(importSignConventions, {
  error: 'Pick the sign convention.',
})

export type ImportSignConvention = (typeof importSignConventions)[number]

/** How a CSV file's bytes are read: detected, or forced by the user. */
export const importEncodings = ['auto', 'utf-8', 'windows-1252'] as const

export const importEncodingSchema = z.enum(importEncodings, {
  error: 'Pick the encoding.',
})

export type ImportEncoding = (typeof importEncodings)[number]

/** The field delimiter of a CSV file; `auto` detects it from the header. */
export const importDelimiters = ['auto', ',', ';', '\t'] as const

export const importDelimiterSchema = z.enum(importDelimiters, {
  error: 'Pick the delimiter.',
})

export type ImportDelimiter = (typeof importDelimiters)[number]

const columnSchema = z
  .number({ error: 'Pick a column.' })
  .int('Pick a column.')
  .min(0, 'Pick a column.')
  .max(255, 'Pick a column.')

/**
 * How an account's CSV files read — saved per account on the first import
 * and reused on the next. Columns are zero-based positions, so a renamed
 * header does not break a saved mapping. The amount is one signed column, or
 * a debit and a credit column.
 */
export const importMappingSchema = z
  .object({
    hasHeader: z.boolean(),
    dateColumn: columnSchema,
    descriptionColumn: columnSchema,
    /** The single signed amount column, or nothing when debit and credit
     * are separate. */
    amountColumn: columnSchema.nullish(),
    debitColumn: columnSchema.nullish(),
    creditColumn: columnSchema.nullish(),
    categoryColumn: columnSchema.nullish(),
    /** A column whose non-empty value marks the row as still pending. */
    pendingColumn: columnSchema.nullish(),
    dateFormat: importDateFormatSchema,
    decimalSeparator: importDecimalSeparatorSchema,
    signConvention: importSignConventionSchema,
    encoding: importEncodingSchema,
    delimiter: importDelimiterSchema,
  })
  .superRefine((mapping, ctx) => {
    const single = mapping.amountColumn != null
    const split = mapping.debitColumn != null && mapping.creditColumn != null

    if (!single && !split) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountColumn'],
        message: 'Pick the amount column, or both debit and credit.',
      })
    }
  })

export type ImportMapping = z.infer<typeof importMappingSchema>

/** The multipart fields the preview route reads next to the file. The
 * mapping rides as JSON text; without one, the account's saved mapping is
 * used for a CSV. */
export const importPreviewFieldsSchema = z.object({
  accountId: z.coerce
    .number({ error: 'Pick an account.' })
    .int()
    .positive('Pick an account.'),
  mapping: z
    .string()
    .optional()
    .transform((text, ctx) => {
      if (text === undefined || text === '') {
        return undefined
      }

      try {
        return JSON.parse(text) as unknown
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'The mapping is not valid JSON.',
        })

        return z.NEVER
      }
    })
    .pipe(importMappingSchema.optional()),
  /** Reads the bytes as this encoding while no mapping is set yet (the
   * mapping step). A mapping carries its own. */
  encoding: importEncodingSchema.optional(),
  /** Reads the fields with this delimiter while no mapping is set yet. */
  delimiter: importDelimiterSchema.optional(),
  /** `true` ignores the account's saved mapping and answers the mapping
   * step (prefilled with the saved one) instead. */
  remap: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type ImportPreviewFields = z.infer<typeof importPreviewFieldsSchema>

/** The installment a row was marked as ("PARC 03/10"). */
export const importInstallmentSchema = z
  .object({
    count: z
      .number()
      .int()
      .min(2, 'At least 2 installments.')
      .max(MAX_INSTALLMENTS, `At most ${MAX_INSTALLMENTS} installments.`),
    number: z.number().int().min(1),
  })
  .refine((installment) => installment.number <= installment.count, {
    path: ['number'],
    message: 'The installment number is past the count.',
  })

export type ImportInstallment = z.infer<typeof importInstallmentSchema>

/** The review status an imported row lands in: a posted bank row is
 * `Checked`, a pending one stays `Verify`. */
export const importRowStatusSchema = z.enum(['Verify', 'Checked'])

/** One row of a commit — already edited by the user. */
export const importCommitRowSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
  note: z.string().max(2000).nullish(),
  amount: amountSchema,
  type: transactionTypeSchema,
  transactionDt: dateOnlySchema,
  categoryId: z
    .number({ error: 'Pick a category.' })
    .int()
    .positive('Pick a category.'),
  receiverId: z.number().int().positive().nullish(),
  /** The bank's own id (OFX `FITID`): a row carrying one already imported
   * is skipped as a duplicate. */
  externalId: z.string().min(1).max(255).nullish(),
  status: importRowStatusSchema,
  /** Links the row as one installment of a purchase (#6): rows sharing the
   * normalized merchant and count form one group. */
  installment: importInstallmentSchema.nullish(),
})

/** The body the commit route accepts. */
export const importCommitSchema = z.object({
  accountId: z
    .number({ error: 'Pick an account.' })
    .int()
    .positive('Pick an account.'),
  /** The CSV mapping the rows were read with — saved for the account. */
  mapping: importMappingSchema.nullish(),
  rows: z
    .array(importCommitRowSchema)
    .min(1, 'Pick at least one row.')
    .max(IMPORT_MAX_ROWS, `At most ${IMPORT_MAX_ROWS} rows.`),
  /** Confirms rows on or before the account's `reconciledThrough`. */
  confirmReconciled: z.boolean().optional(),
})

export type ImportCommitRow = z.infer<typeof importCommitRowSchema>
export type ImportCommitBody = z.infer<typeof importCommitSchema>

/** The query the recent-batches route reads. */
export const importBatchesQuerySchema = z.object({
  accountId: z.coerce.number().int().positive(),
})

export type ImportBatchesQuery = z.infer<typeof importBatchesQuerySchema>

/** Why a row is flagged as a duplicate: the bank id is already imported
 * (`external`, skipped), or an existing row looks alike (`probable`, the
 * user decides). */
export type ImportDuplicate = {
  kind: 'external' | 'probable'
  transactionId: number
  name: string
  transactionDt: string
  amount: string
}

/** Where a suggested category or receiver came from. */
export type ImportSuggestionSource = 'file' | 'linker' | 'inferred'

/** The bill a card row lands on, by the card's cycle. */
export type ImportStatementWindow = {
  periodStart: string
  closeDate: string
  dueDate: string
}

/** One parsed row of a preview. */
export type ImportPreviewRow = {
  index: number
  name: string
  amount: string
  type: TransactionType
  transactionDt: string
  externalId: string | null
  /** A pending CSV row: it imports as `Verify`. */
  pending: boolean
  categoryId: number | null
  categoryName: string | null
  receiverId: number | null
  receiverName: string | null
  /** What suggested the category, or nothing when none matched. */
  suggestionSource: ImportSuggestionSource | null
  duplicate: ImportDuplicate | null
  /** A card bill payment: skipped by default, the payment already exists as
   * a transfer from the checking side. */
  billPayment: boolean
  /** The bill the row lands on; only for a card with its days set. */
  statement: ImportStatementWindow | null
  /** The installment marker found in the description, or nothing. */
  installment: ImportInstallment | null
}

/** A line of the file that could not be read as a row. */
export type ImportInvalidLine = {
  /** The 1-based record number in the file (the header counts). */
  line: number
  reason: 'date' | 'amount' | 'description'
}

/** What the preview route answers with. */
export type ImportPreview = {
  format: ImportFormat
  /** The currency the file declares (OFX `CURDEF`), or nothing. */
  currency: Currency | null
  /** The encoding the bytes were read as. */
  encoding: Exclude<ImportEncoding, 'auto'>
  /** Whether the account is a credit card (bills, installments). */
  isCard: boolean
  /** A CSV with no mapping yet: the rows wait for one. */
  needsMapping: boolean
  /** The CSV's first row cells (or `Column 1…` without a header). */
  headers: string[]
  /** The first data rows, raw, for the mapping step. */
  sample: string[][]
  /** The mapping applied; while `needsMapping`, the saved one to prefill
   * the mapping step with, or nothing. */
  mapping: ImportMapping | null
  rows: ImportPreviewRow[]
  /** How many lines could not be read, and the first of them. */
  invalidCount: number
  invalid: ImportInvalidLine[]
}

/** What the commit route answers with. */
export type ImportResult = {
  batchId: string | null
  imported: number
  skippedDuplicates: number
  undoUntil: string | null
}

/** A recent import that can still be undone. */
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

/* -------------------------------------------------------------------------
 * Pure helpers
 * ---------------------------------------------------------------------- */

/**
 * Reads an amount written in a bank file into the signed money-string shape
 * (`"-1234.56"`), through exact integer cents — never a float. The decimal
 * separator is the chosen one; the other character may only group thousands,
 * in groups of three, so `1234.56` read with `,` is refused rather than read
 * as 123,456.00. Accepts currency symbols, spaces, a leading `+`/`-`, a
 * trailing `-`, and `(12,34)` negatives. Answers `null` when the text is not
 * an amount.
 */
export function parseLocalizedAmount(
  text: string,
  decimalSeparator: ImportDecimalSeparator
): string | null {
  let value = text
    .replace(/\s/g, '')
    .replace(/^(?:R\$|US\$|U\$|\$|€|EUR|USD|BRL)/i, '')

  let negative = false

  if (/^\(.*\)$/.test(value)) {
    negative = true
    value = value.slice(1, -1)
  }

  if (value.endsWith('-')) {
    negative = !negative
    value = value.slice(0, -1)
  }

  if (value.startsWith('-')) {
    negative = !negative
    value = value.slice(1)
  } else if (value.startsWith('+')) {
    value = value.slice(1)
  }

  value = value.replace(/^(?:R\$|US\$|U\$|\$|€)/i, '')

  const thousands = decimalSeparator === ',' ? '\\.' : ','
  const decimal = decimalSeparator === ',' ? ',' : '\\.'
  const shape = new RegExp(
    `^(\\d{1,3}(?:${thousands}\\d{3})+|\\d+)(?:${decimal}(\\d+))?$`
  )
  const match = shape.exec(value)

  if (match === null) {
    return null
  }

  const whole = match[1].replace(new RegExp(thousands, 'g'), '')
  const fraction = match[2] ?? ''

  // More than two decimals is a rate or a quantity, not a money amount —
  // unless the extra digits are zeros.
  if (fraction.length > 2 && /[1-9]/.test(fraction.slice(2))) {
    return null
  }

  const magnitude = formatCents(
    toCents(`${whole}.${`${fraction}00`.slice(0, 2)}`)
  )

  return negative && magnitude !== '0.00' ? `-${magnitude}` : magnitude
}

/**
 * Reads a date written in a bank file into `YYYY-MM-DD`. The separator may
 * be `/`, `-`, or `.`; a time after a space or `T` is ignored; a two-digit
 * year is read as 20YY. Answers `null` for text that is no real calendar
 * day (`31/02/2026`).
 */
export function parseImportDate(
  text: string,
  format: ImportDateFormat
): string | null {
  const cleaned = text.trim().split(/[\sT]/)[0]
  const parts = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})$/.exec(cleaned)

  if (parts === null) {
    return null
  }

  const [, first, second, third] = parts
  let year: string
  let month: string
  let day: string

  if (format === 'YYYY-MM-DD') {
    ;[year, month, day] = [first, second, third]
  } else if (format === 'DD/MM/YYYY') {
    ;[day, month, year] = [first, second, third]
  } else {
    ;[month, day, year] = [first, second, third]
  }

  if (year.length === 2) {
    year = `20${year}`
  }

  if (year.length !== 4) {
    return null
  }

  return toIsoDay(Number(year), Number(month), Number(day))
}

/** Builds `YYYY-MM-DD` from calendar parts, or `null` when the day does not
 * exist. */
export function toIsoDay(
  year: number,
  month: number,
  day: number
): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Folds a description for comparison: lowercase, no accents, no digits, no
 * punctuation, single spaces. */
export function normalizeImportText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

/** The share (0–1) of character pairs two descriptions have in common
 * (Sørensen–Dice on the normalized text); 1 when they normalize equal. */
export function descriptionSimilarity(a: string, b: string): number {
  const left = normalizeImportText(a)
  const right = normalizeImportText(b)

  if (left === right) {
    return 1
  }

  if (left.length < 2 || right.length < 2) {
    return 0
  }

  const pairs = new Map<string, number>()

  for (let index = 0; index < left.length - 1; index++) {
    const pair = left.slice(index, index + 2)

    pairs.set(pair, (pairs.get(pair) ?? 0) + 1)
  }

  let shared = 0

  for (let index = 0; index < right.length - 1; index++) {
    const pair = right.slice(index, index + 2)
    const available = pairs.get(pair) ?? 0

    if (available > 0) {
      pairs.set(pair, available - 1)
      shared++
    }
  }

  return (2 * shared) / (left.length - 1 + (right.length - 1))
}

/** Whether a day is within `days` calendar days of another. */
export function withinDays(a: string, b: string, days: number): boolean {
  const gap = Math.abs(
    Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)
  )

  return gap <= days * 86_400_000
}

/** An installment marker found in a card description. */
export type InstallmentMarker = ImportInstallment & {
  /** The description without the marker, normalized — what rows of one
   * purchase share. */
  merchant: string
}

const MARKER_PARC = /\bPARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE|-)\s*(\d{1,2})\b/i
const MARKER_TRAILING = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*$/

/**
 * Finds the installment marker of a card description: `LOJA X PARC 03/10`,
 * `PARCELA 3 DE 10`, or a trailing `LOJA X 3/10`. The number must fit its
 * count and the count must be a plausible split (2–48), so `12/05` or a
 * date never reads as an installment. Answers the marker with the merchant
 * it belongs to, or `null`.
 */
export function detectInstallmentMarker(
  description: string
): InstallmentMarker | null {
  for (const pattern of [MARKER_PARC, MARKER_TRAILING]) {
    const match = pattern.exec(description)

    if (match === null) {
      continue
    }

    const number = Number(match[1])
    const count = Number(match[2])

    if (count < 2 || count > MAX_INSTALLMENTS || number < 1 || number > count) {
      continue
    }

    return {
      number,
      count,
      merchant: normalizeImportText(
        description.slice(0, match.index) +
          ' ' +
          description.slice(match.index + match[0].length)
      ),
    }
  }

  return null
}

const BILL_PAYMENT =
  /pagamento (?:recebido|efetuado|de fatura|fatura|on line|online)|pgto fatura|pagto fatura|pagamento da fatura|credito de pagamento|payment (?:received|thank you)|online payment|autopay payment/

/** Whether a card description is a bill payment ("Pagamento recebido") —
 * the payment already exists as a transfer from the paying account. */
export function isBillPaymentDescription(description: string): boolean {
  return BILL_PAYMENT.test(normalizeImportText(description))
}
