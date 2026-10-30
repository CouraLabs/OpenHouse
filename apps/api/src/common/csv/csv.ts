import type { CsvLocale } from '@workspace/poco'

export const CSV_BOM = '\uFEFF'

const LINE_END = '\r\n'

export interface CsvFormat {
  separator: ',' | ';'
  decimal: '.' | ','
  dateStyle: 'iso' | 'dmy'
}

export const CSV_FORMATS: Record<CsvLocale, CsvFormat> = {
  'en-US': { separator: ',', decimal: '.', dateStyle: 'iso' },
  'pt-BR': { separator: ';', decimal: ',', dateStyle: 'dmy' },
}

export interface CsvMoney {
  kind: 'money'
  value: string
}

export interface CsvDay {
  kind: 'day'
  value: string
}

export type CsvCell = string | number | boolean | null | CsvMoney | CsvDay

export interface CsvColumn<Row> {
  header: string
  cell: (row: Row) => CsvCell
}

export function money(value: string | null): CsvCell {
  return value === null ? null : { kind: 'money', value }
}

export function day(value: string | null): CsvCell {
  return value === null ? null : { kind: 'day', value }
}

const MONEY_SHAPE = /^-?\d+(\.\d+)?$/
const DAY_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/

const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r'])

export function guardInjection(text: string): string {
  return text !== '' && FORMULA_TRIGGERS.has(text[0] ?? '') ? `'${text}` : text
}

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
