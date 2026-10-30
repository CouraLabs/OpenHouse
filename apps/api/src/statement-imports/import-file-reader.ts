import { BadRequestError } from '../common/errors.js'
import {
  IMPORT_MAX_ROWS,
  type ImportDelimiter,
  type ImportEncoding,
  type ImportFormat,
  type ImportMapping,
} from '@workspace/poco'

import { parseCsv } from './csv-parser.js'
import { mapCsvRecords } from './csv-rows.js'
import {
  decodeImportBytes,
  ofxEncodingHint,
  type ResolvedEncoding,
} from './import-decoder.js'
import { OfxFormatError, parseOfx } from './ofx-parser.js'
import type { ParsedImport, ParsedImportRow } from './parsed-import.js'

const SAMPLE_ROWS = 5

export interface ReadFile {
  format: ImportFormat
  encoding: ResolvedEncoding
  currencies: string[]
  statementKind: 'bank' | 'card' | 'unknown'
  headers: string[]
  sample: string[][]
  parsed: ParsedImport | null
}

function assertRowCount(count: number): void {
  if (count > IMPORT_MAX_ROWS) {
    throw new BadRequestError(
      `An import takes at most ${IMPORT_MAX_ROWS} rows; this file has ${count}. Split it and import the parts.`
    )
  }
}

export function readOfxFile(bytes: Uint8Array): ReadFile {
  const { text, encoding } = decodeImportBytes(bytes, ofxEncodingHint(bytes))
  let statement: ReturnType<typeof parseOfx>

  try {
    statement = parseOfx(text)
  } catch (error) {
    if (error instanceof OfxFormatError) {
      throw new BadRequestError(error.message)
    }

    throw error
  }

  assertRowCount(statement.transactions.length)

  const rows: ParsedImportRow[] = statement.transactions.map((row) => ({
    name: row.name.slice(0, 255),
    note: row.memo,
    amount: row.amount.startsWith('-') ? row.amount.slice(1) : row.amount,
    type: row.amount.startsWith('-') ? 'Expense' : 'Income',
    transactionDt: row.postedOn,
    externalId: row.fitId === null ? null : row.fitId.slice(0, 255),
    pending: false,
    categoryText: null,
    paymentHint: row.kind === 'PAYMENT',
  }))

  return {
    format: 'ofx',
    encoding,
    currencies: statement.currencies,
    statementKind: statement.kind,
    headers: [],
    sample: [],
    parsed: { rows, invalidCount: statement.invalid, invalid: [] },
  }
}

export function readCsvFile(
  bytes: Uint8Array,
  options: {
    mapping: ImportMapping | undefined
    encoding: ImportEncoding
    delimiter: ImportDelimiter
  }
): ReadFile {
  const { mapping } = options
  const { text, encoding } = decodeImportBytes(
    bytes,
    mapping?.encoding ?? options.encoding
  )
  const { records } = parseCsv(text, mapping?.delimiter ?? options.delimiter)

  if (records.length === 0) {
    throw new BadRequestError('The file is empty.')
  }

  const hasHeader = mapping?.hasHeader ?? true

  assertRowCount(records.length - (hasHeader ? 1 : 0))

  const width = Math.max(...records.slice(0, 50).map((row) => row.length))
  const headers = hasHeader
    ? records[0].map((cell, index) => cell.trim() || `Column ${index + 1}`)
    : Array.from({ length: width }, (_, index) => `Column ${index + 1}`)

  return {
    format: 'csv',
    encoding,
    currencies: [],
    statementKind: 'unknown',
    headers,
    sample: records.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + SAMPLE_ROWS),
    parsed: mapping === undefined ? null : mapCsvRecords(records, mapping),
  }
}
