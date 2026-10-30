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

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024

export const IMPORT_COMMIT_MAX_BYTES = 2 * 1024 * 1024

export const IMPORT_MAX_ROWS = 5000

export const IMPORT_CHUNK_SIZE = 500

export const IMPORT_UNDO_HOURS = 24

export const importFileExtensions = ['.ofx', '.qfx', '.csv'] as const

export const IMPORT_DUPLICATE_DAYS = 2

export const IMPORT_DUPLICATE_SIMILARITY = 0.6

export const importFormats = ['ofx', 'csv'] as const

export type ImportFormat = (typeof importFormats)[number]

export const importDateFormats = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
] as const

export const importDateFormatSchema = z.enum(importDateFormats, {
  error: 'Pick the date format.',
})

export type ImportDateFormat = (typeof importDateFormats)[number]

export const importDecimalSeparators = [',', '.'] as const

export const importDecimalSeparatorSchema = z.enum(importDecimalSeparators, {
  error: 'Pick the decimal separator.',
})

export type ImportDecimalSeparator = (typeof importDecimalSeparators)[number]

export const importSignConventions = [
  'negativeIsExpense',
  'positiveIsExpense',
] as const

export const importSignConventionSchema = z.enum(importSignConventions, {
  error: 'Pick the sign convention.',
})

export type ImportSignConvention = (typeof importSignConventions)[number]

export const importEncodings = ['auto', 'utf-8', 'windows-1252'] as const

export const importEncodingSchema = z.enum(importEncodings, {
  error: 'Pick the encoding.',
})

export type ImportEncoding = (typeof importEncodings)[number]

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

export const importMappingSchema = z
  .object({
    hasHeader: z.boolean(),
    dateColumn: columnSchema,
    descriptionColumn: columnSchema,
    amountColumn: columnSchema.nullish(),
    debitColumn: columnSchema.nullish(),
    creditColumn: columnSchema.nullish(),
    categoryColumn: columnSchema.nullish(),
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
  encoding: importEncodingSchema.optional(),
  delimiter: importDelimiterSchema.optional(),
  remap: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type ImportPreviewFields = z.infer<typeof importPreviewFieldsSchema>

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

export const importRowStatusSchema = z.enum(['Verify', 'Checked'])

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
  externalId: z.string().min(1).max(255).nullish(),
  status: importRowStatusSchema,
  installment: importInstallmentSchema.nullish(),
})

export const importCommitSchema = z.object({
  accountId: z
    .number({ error: 'Pick an account.' })
    .int()
    .positive('Pick an account.'),
  mapping: importMappingSchema.nullish(),
  rows: z
    .array(importCommitRowSchema)
    .min(1, 'Pick at least one row.')
    .max(IMPORT_MAX_ROWS, `At most ${IMPORT_MAX_ROWS} rows.`),
  confirmReconciled: z.boolean().optional(),
})

export type ImportCommitRow = z.infer<typeof importCommitRowSchema>
export type ImportCommitBody = z.infer<typeof importCommitSchema>

export const importBatchesQuerySchema = z.object({
  accountId: z.coerce.number().int().positive(),
})

export type ImportBatchesQuery = z.infer<typeof importBatchesQuerySchema>

export type ImportDuplicate = {
  kind: 'external' | 'probable'
  transactionId: number
  name: string
  transactionDt: string
  amount: string
}

export type ImportSuggestionSource = 'file' | 'linker' | 'inferred'

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
  reason: 'date' | 'amount' | 'description'
}

export type ImportPreview = {
  format: ImportFormat
  currency: Currency | null
  encoding: Exclude<ImportEncoding, 'auto'>
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

  if (fraction.length > 2 && /[1-9]/.test(fraction.slice(2))) {
    return null
  }

  const magnitude = formatCents(
    toCents(`${whole}.${`${fraction}00`.slice(0, 2)}`)
  )

  return negative && magnitude !== '0.00' ? `-${magnitude}` : magnitude
}

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

export function normalizeImportText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

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

export function withinDays(a: string, b: string, days: number): boolean {
  const gap = Math.abs(
    Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)
  )

  return gap <= days * 86_400_000
}

export type InstallmentMarker = ImportInstallment & {
  merchant: string
}

const MARKER_PARC = /\bPARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE|-)\s*(\d{1,2})\b/i
const MARKER_TRAILING = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*$/

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

export function isBillPaymentDescription(description: string): boolean {
  return BILL_PAYMENT.test(normalizeImportText(description))
}
