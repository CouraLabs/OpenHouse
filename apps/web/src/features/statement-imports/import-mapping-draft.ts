import {
  importMappingSchema,
  type ImportDateFormat,
  type ImportDecimalSeparator,
  type ImportDelimiter,
  type ImportEncoding,
  type ImportMapping,
  type ImportSignConvention,
} from '@workspace/poco'

/** A column choice as the selects hold it: a position as text, or `''`. */
export type ColumnChoice = string

/** The mapping form's values — every select holds text until submit. */
export interface MappingDraft {
  hasHeader: boolean
  dateColumn: ColumnChoice
  descriptionColumn: ColumnChoice
  amountLayout: 'single' | 'split'
  amountColumn: ColumnChoice
  debitColumn: ColumnChoice
  creditColumn: ColumnChoice
  categoryColumn: ColumnChoice
  pendingColumn: ColumnChoice
  dateFormat: ImportDateFormat
  decimalSeparator: ImportDecimalSeparator
  signConvention: ImportSignConvention
  encoding: ImportEncoding
  delimiter: ImportDelimiter
}

/** The position of the first header matching a pattern, as text, or `''`. */
function find(headers: readonly string[], pattern: RegExp): ColumnChoice {
  const index = headers.findIndex((header) => pattern.test(header))

  return index === -1 ? '' : String(index)
}

/**
 * The form's starting values: the mapping saved for the account when there
 * is one, else a guess from the header names (`Data`, `Descrição`, `Valor`,
 * `Débito`/`Crédito`, `Categoria`, `Status`) with the Brazilian defaults.
 */
export function initialDraft(
  headers: readonly string[],
  saved: ImportMapping | null
): MappingDraft {
  const text = (column: number | null | undefined) =>
    column == null ? '' : String(column)

  if (saved !== null) {
    return {
      hasHeader: saved.hasHeader,
      dateColumn: text(saved.dateColumn),
      descriptionColumn: text(saved.descriptionColumn),
      amountLayout: saved.amountColumn == null ? 'split' : 'single',
      amountColumn: text(saved.amountColumn),
      debitColumn: text(saved.debitColumn),
      creditColumn: text(saved.creditColumn),
      categoryColumn: text(saved.categoryColumn),
      pendingColumn: text(saved.pendingColumn),
      dateFormat: saved.dateFormat,
      decimalSeparator: saved.decimalSeparator,
      signConvention: saved.signConvention,
      encoding: saved.encoding,
      delimiter: saved.delimiter,
    }
  }

  const debit = find(headers, /d[ée]bit|sa[ií]da|debit/i)
  const credit = find(headers, /cr[ée]dit|entrada|credit/i)
  const amount = find(headers, /valor|amount|value|quantia/i)

  return {
    hasHeader: true,
    dateColumn: find(headers, /data|date/i),
    descriptionColumn: find(
      headers,
      /descri|hist[óo]rico|memo|estabelecimento|lan[çc]amento|payee|name/i
    ),
    amountLayout:
      amount === '' && debit !== '' && credit !== '' ? 'split' : 'single',
    amountColumn: amount,
    debitColumn: debit,
    creditColumn: credit,
    categoryColumn: find(headers, /categor/i),
    pendingColumn: find(headers, /status|situa[çc][ãa]o|pend/i),
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    signConvention: 'negativeIsExpense',
    encoding: 'auto',
    delimiter: 'auto',
  }
}

/** A select's text as a column position, or nothing for `''`. */
function column(choice: ColumnChoice): number | undefined {
  return choice === '' ? undefined : Number(choice)
}

/** The validation result for a draft: the poco mapping, or the first
 * message for each field the schema rejected. */
export type DraftResult =
  | { ok: true; mapping: ImportMapping }
  | { ok: false; errors: Record<string, string> }

/**
 * Turns the form's values into the mapping and validates it with the poco
 * schema — the one both sides run — so the form restates no rule of its own.
 */
export function draftToMapping(draft: MappingDraft): DraftResult {
  const single = draft.amountLayout === 'single'
  const parsed = importMappingSchema.safeParse({
    hasHeader: draft.hasHeader,
    dateColumn: column(draft.dateColumn),
    descriptionColumn: column(draft.descriptionColumn),
    amountColumn: single ? column(draft.amountColumn) : null,
    debitColumn: single ? null : column(draft.debitColumn),
    creditColumn: single ? null : column(draft.creditColumn),
    categoryColumn: column(draft.categoryColumn) ?? null,
    pendingColumn: column(draft.pendingColumn) ?? null,
    dateFormat: draft.dateFormat,
    decimalSeparator: draft.decimalSeparator,
    signConvention: draft.signConvention,
    encoding: draft.encoding,
    delimiter: draft.delimiter,
  })

  if (parsed.success) {
    return { ok: true, mapping: parsed.data }
  }

  const errors: Record<string, string> = {}

  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form')

    errors[key] ??= issue.message
  }

  return { ok: false, errors }
}
