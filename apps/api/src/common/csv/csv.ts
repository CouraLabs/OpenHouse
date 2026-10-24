import type { CsvLocale } from '@workspace/poco'

/**
 * Pure CSV encoding shared by every export route: locale-aware numbers and
 * dates, RFC 4180 quoting, and the CSV-injection guard. Nothing here knows
 * an entity — a feature describes its columns and hands the rows over.
 */

/** The UTF-8 byte order mark that makes Excel read accents correctly. */
export const CSV_BOM = '\uFEFF'

/** A row ends with CRLF, as RFC 4180 and Excel expect. */
const LINE_END = '\r\n'

/** How a locale writes a CSV. */
export interface CsvFormat {
  separator: ',' | ';'
  /** The decimal mark of money and numbers. */
  decimal: '.' | ','
  /** `iso` is `YYYY-MM-DD`; `dmy` is `DD/MM/YYYY`. */
  dateStyle: 'iso' | 'dmy'
}

/**
 * pt-BR writes `;` between cells (the comma is its decimal mark), `,` as the
 * decimal, and `DD/MM/YYYY`; en-US writes `,`, `.`, and ISO dates.
 */
export const CSV_FORMATS: Record<CsvLocale, CsvFormat> = {
  'en-US': { separator: ',', decimal: '.', dateStyle: 'iso' },
  'pt-BR': { separator: ';', decimal: ',', dateStyle: 'dmy' },
}

/** An amount carried as a string ("12.34"): written with the locale's
 * decimal mark, and never prefixed — a negative balance is a number. */
export interface CsvMoney {
  kind: 'money'
  value: string
}

/** A calendar day carried as `YYYY-MM-DD`: written in the locale's style. */
export interface CsvDay {
  kind: 'day'
  value: string
}

/** What a cell can hold. Plain strings are text, so they pass the
 * injection guard; numbers, booleans, money, and days are typed. */
export type CsvCell = string | number | boolean | null | CsvMoney | CsvDay

/** One column: its header and how a row fills it. */
export interface CsvColumn<Row> {
  header: string
  cell: (row: Row) => CsvCell
}

/** Marks an amount string as money. */
export function money(value: string | null): CsvCell {
  return value === null ? null : { kind: 'money', value }
}

/** Marks a `YYYY-MM-DD` string as a calendar day. */
export function day(value: string | null): CsvCell {
  return value === null ? null : { kind: 'day', value }
}

const MONEY_SHAPE = /^-?\d+(\.\d+)?$/
const DAY_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/

/** The characters that make a spreadsheet read a cell as a formula. */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r'])

/**
 * Neutralizes a text cell a spreadsheet could run as a formula: one that
 * starts with `=`, `+`, `-`, `@`, a tab, or a carriage return gets a leading
 * `'`, which spreadsheets read as "this is text".
 */
export function guardInjection(text: string): string {
  return text !== '' && FORMULA_TRIGGERS.has(text[0] ?? '') ? `'${text}` : text
}

/** Quotes a cell when it holds the separator, a quote, or a line break. */
export function quoteCell(text: string, separator: string): string {
  if (
    text.includes(separator) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

/** The text of a cell in a locale, before quoting. Text is guarded; typed
 * cells (money, days, numbers) are written as the locale reads them. */
export function cellText(cell: CsvCell, format: CsvFormat): string {
  if (cell === null) {
    return ''
  }
  if (typeof cell === 'boolean') {
    return cell ? 'true' : 'false'
  }
  if (typeof cell === 'number') {
    return Number.isFinite(cell)
      ? String(cell).replace('.', format.decimal)
      : ''
  }
  if (typeof cell === 'string') {
    return guardInjection(cell)
  }
  if (cell.kind === 'money') {
    // A value that is not an amount is not trusted as one: it is text.
    return MONEY_SHAPE.test(cell.value)
      ? cell.value.replace('.', format.decimal)
      : guardInjection(cell.value)
  }

  const parts = DAY_SHAPE.exec(cell.value)
  if (parts === null) {
    return guardInjection(cell.value)
  }

  return format.dateStyle === 'iso'
    ? cell.value
    : `${parts[3]}/${parts[2]}/${parts[1]}`
}

/** Encodes one row, ending with the line break. */
export function encodeRow(
  cells: readonly CsvCell[],
  format: CsvFormat
): string {
  return (
    cells
      .map((cell) => quoteCell(cellText(cell, format), format.separator))
      .join(format.separator) + LINE_END
  )
}

/**
 * The chunks of a whole CSV: the BOM and the header row, then one chunk per
 * page of rows. Pages are pulled one at a time, so a large export never
 * holds more than a page in memory.
 */
export async function* csvChunks<Row>(
  columns: readonly CsvColumn<Row>[],
  pages: AsyncIterable<Row[]>,
  locale: CsvLocale
): AsyncGenerator<string> {
  const format = CSV_FORMATS[locale]

  yield CSV_BOM +
    encodeRow(
      columns.map((column) => column.header),
      format
    )

  for await (const page of pages) {
    yield page
      .map((row) =>
        encodeRow(
          columns.map((column) => column.cell(row)),
          format
        )
      )
      .join('')
  }
}

/** Reads a source page by page: `read(skip, size)` until a short page. */
export async function* pagesOf<Row>(
  read: (skip: number, size: number) => Promise<Row[]>,
  size: number
): AsyncGenerator<Row[]> {
  for (let skip = 0; ; skip += size) {
    const page = await read(skip, size)
    if (page.length > 0) {
      yield page
    }
    if (page.length < size) {
      return
    }
  }
}
