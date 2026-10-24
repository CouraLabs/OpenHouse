import {
  negateMoney,
  normalizeImportText,
  parseImportDate,
  parseLocalizedAmount,
  amountSchema,
  type ImportMapping,
} from '@workspace/poco'

import {
  INVALID_LINES_SHOWN,
  type ParsedImport,
  type ParsedImportRow,
} from './parsed-import.js'

/** Pending flags banks write in a status column. */
const PENDING = /^(?:pend\w*|true|sim|yes|s|y|1)$/

/** The cells of the columns a mapping points at, or `undefined` past the
 * end of a short record. */
function cell(record: readonly string[], column: number | null | undefined) {
  return column == null ? undefined : record[column]?.trim()
}

/**
 * Applies a saved or chosen mapping to the records of a CSV file, row by row.
 * Amounts go through `parseLocalizedAmount` — exact cents, the chosen
 * decimal separator — so `1.234,56` and `1,234.56` are both read right and a
 * float is never involved. A record whose day, amount, or description cannot
 * be read is counted as invalid (the first ones reported with their line)
 * rather than guessed at; a zero amount moves nothing and is dropped.
 */
export function mapCsvRecords(
  records: readonly (readonly string[])[],
  mapping: ImportMapping
): ParsedImport {
  const rows: ParsedImportRow[] = []
  const result: ParsedImport = { rows, invalidCount: 0, invalid: [] }
  const fail = (
    line: number,
    reason: 'date' | 'amount' | 'description'
  ): void => {
    result.invalidCount++

    if (result.invalid.length < INVALID_LINES_SHOWN) {
      result.invalid.push({ line, reason })
    }
  }

  for (const [index, record] of records.entries()) {
    if (mapping.hasHeader && index === 0) {
      continue
    }

    const line = index + 1
    const transactionDt = parseImportDate(
      cell(record, mapping.dateColumn) ?? '',
      mapping.dateFormat
    )

    if (transactionDt === null) {
      fail(line, 'date')
      continue
    }

    const name = cell(record, mapping.descriptionColumn) ?? ''

    if (name === '') {
      fail(line, 'description')
      continue
    }

    const signed = readSigned(record, mapping)

    if (
      signed === null ||
      !amountSchema.safeParse(abs(signed.amount)).success
    ) {
      fail(line, 'amount')
      continue
    }

    if (signed.amount === '0.00') {
      continue
    }

    const pending = cell(record, mapping.pendingColumn)
    const categoryText = cell(record, mapping.categoryColumn)

    rows.push({
      name: name.slice(0, 255),
      note: null,
      amount: abs(signed.amount),
      type: signed.expense ? 'Expense' : 'Income',
      transactionDt,
      externalId: null,
      pending:
        pending !== undefined &&
        PENDING.test(normalizeImportText(pending) || pending.toLowerCase()),
      categoryText:
        categoryText === undefined || categoryText === '' ? null : categoryText,
      paymentHint: false,
    })
  }

  return result
}

/** The amount of a record and whether it is an expense, by the mapping's
 * single signed column and sign convention, or its debit/credit pair. */
function readSigned(
  record: readonly string[],
  mapping: ImportMapping
): { amount: string; expense: boolean } | null {
  if (mapping.amountColumn != null) {
    const amount = parseLocalizedAmount(
      cell(record, mapping.amountColumn) ?? '',
      mapping.decimalSeparator
    )

    if (amount === null) {
      return null
    }

    const negative = amount.startsWith('-')

    return {
      amount,
      expense:
        mapping.signConvention === 'negativeIsExpense' ? negative : !negative,
    }
  }

  const debit = parseSide(cell(record, mapping.debitColumn), mapping)
  const credit = parseSide(cell(record, mapping.creditColumn), mapping)

  if (debit === null || credit === null) {
    return null
  }

  if (debit !== '0.00') {
    return { amount: debit, expense: true }
  }

  return { amount: credit, expense: false }
}

/** One side of a debit/credit pair: empty is zero, the sign is dropped. */
function parseSide(text: string | undefined, mapping: ImportMapping) {
  if (text === undefined || text === '') {
    return '0.00'
  }

  const amount = parseLocalizedAmount(text, mapping.decimalSeparator)

  return amount === null ? null : abs(amount)
}

function abs(amount: string): string {
  return amount.startsWith('-') ? negateMoney(amount) : amount
}
