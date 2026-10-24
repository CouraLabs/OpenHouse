import { describe, expect, it } from 'vitest'
import type { ImportMapping } from '@workspace/poco'

import { parseCsv } from './csv-parser.js'
import { mapCsvRecords } from './csv-rows.js'
import { decodeImportBytes } from './import-decoder.js'
import { readCsvFile } from './import-file-reader.js'

const base: ImportMapping = {
  hasHeader: true,
  dateColumn: 0,
  descriptionColumn: 1,
  amountColumn: 2,
  categoryColumn: null,
  pendingColumn: null,
  dateFormat: 'DD/MM/YYYY',
  decimalSeparator: ',',
  signConvention: 'negativeIsExpense',
  encoding: 'auto',
  delimiter: 'auto',
}

describe('parseCsv', () => {
  it('detects the delimiter and keeps quoted delimiters and breaks', () => {
    const result = parseCsv(
      'Data;Descrição;Valor\r\n05/01/2026;"Loja; filial ""Centro""";-1.234,56\n06/01/2026;"Duas\nlinhas";10,00\n'
    )

    expect(result.delimiter).toBe(';')
    expect(result.records).toEqual([
      ['Data', 'Descrição', 'Valor'],
      ['05/01/2026', 'Loja; filial "Centro"', '-1.234,56'],
      ['06/01/2026', 'Duas\nlinhas', '10,00'],
    ])
  })

  it('detects commas and tabs, skips blank lines, honors a forced one', () => {
    expect(parseCsv('a,b,c\n\n1,2,3\n').records).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
    expect(parseCsv('a\tb\n1\t2').delimiter).toBe('\t')
    expect(parseCsv('a;b,c\n1;2,3', ',').records[0]).toEqual(['a;b', 'c'])
  })
})

describe('CSV encodings', () => {
  const text = 'Data;Descrição;Valor\n05/01/2026;AÇAÍ CAFÉ;-12,30\n'

  it('detects UTF-8 with and without a BOM', () => {
    const utf8 = Uint8Array.from(Buffer.from(text, 'utf8'))
    const bom = Uint8Array.from(
      Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(text, 'utf8'),
      ])
    )

    expect(decodeImportBytes(utf8)).toEqual({ text, encoding: 'utf-8' })
    expect(decodeImportBytes(bom)).toEqual({ text, encoding: 'utf-8' })
  })

  it('falls back to Windows-1252 for Latin-1 bytes, and can be forced', () => {
    const latin1 = Uint8Array.from(Buffer.from(text, 'latin1'))

    expect(decodeImportBytes(latin1)).toEqual({
      text,
      encoding: 'windows-1252',
    })
    // Forcing UTF-8 on Latin-1 bytes shows the replacement character.
    expect(decodeImportBytes(latin1, 'utf-8').text).toContain('�')
  })

  it('reads a Latin-1 CSV end to end with correct accents', () => {
    const read = readCsvFile(Uint8Array.from(Buffer.from(text, 'latin1')), {
      mapping: base,
      encoding: 'auto',
      delimiter: 'auto',
    })

    expect(read.encoding).toBe('windows-1252')
    expect(read.parsed?.rows[0].name).toBe('AÇAÍ CAFÉ')
  })
})

describe('mapCsvRecords', () => {
  it('reads Brazilian dates and numbers', () => {
    const { rows } = mapCsvRecords(
      [
        ['Data', 'Descrição', 'Valor'],
        ['05/01/2026', 'MERCADO', '-1.234,56'],
        ['06/01/2026', 'SALÁRIO', '5.000,00'],
      ],
      base
    )

    expect(
      rows.map((row) => [row.transactionDt, row.type, row.amount])
    ).toEqual([
      ['2026-01-05', 'Expense', '1234.56'],
      ['2026-01-06', 'Income', '5000.00'],
    ])
  })

  it('reads US dates and numbers', () => {
    const { rows } = mapCsvRecords(
      [
        ['Date', 'Description', 'Amount'],
        ['01/05/2026', 'GROCERY', '-1,234.56'],
        ['01/06/2026', 'PAYCHECK', '5,000.00'],
      ],
      { ...base, dateFormat: 'MM/DD/YYYY', decimalSeparator: '.' }
    )

    expect(
      rows.map((row) => [row.transactionDt, row.type, row.amount])
    ).toEqual([
      ['2026-01-05', 'Expense', '1234.56'],
      ['2026-01-06', 'Income', '5000.00'],
    ])
  })

  it('reads ISO dates and the opposite sign convention', () => {
    const { rows } = mapCsvRecords([['2026-01-05', 'COMPRA', '89,90']], {
      ...base,
      hasHeader: false,
      dateFormat: 'YYYY-MM-DD',
      signConvention: 'positiveIsExpense',
    })

    expect(rows[0]).toMatchObject({ type: 'Expense', amount: '89.90' })
  })

  it('reads separate debit and credit columns', () => {
    const { rows } = mapCsvRecords(
      [
        ['Data', 'Histórico', 'Débito', 'Crédito'],
        ['05/01/2026', 'PIX ENVIADO', '10,00', ''],
        ['06/01/2026', 'PIX RECEBIDO', '', '20,50'],
        ['07/01/2026', 'SEM VALOR', '', ''],
      ],
      { ...base, amountColumn: null, debitColumn: 2, creditColumn: 3 }
    )

    expect(rows.map((row) => [row.type, row.amount])).toEqual([
      ['Expense', '10.00'],
      ['Income', '20.50'],
    ])
  })

  it('keeps a category and a pending flag', () => {
    const { rows } = mapCsvRecords(
      [
        ['Data', 'Descrição', 'Valor', 'Categoria', 'Status'],
        ['05/01/2026', 'MERCADO', '-10,00', 'Mercado', 'Pendente'],
        ['06/01/2026', 'POSTO', '-20,00', 'Carro', 'Lançado'],
      ],
      { ...base, categoryColumn: 3, pendingColumn: 4 }
    )

    expect(rows.map((row) => [row.categoryText, row.pending])).toEqual([
      ['Mercado', true],
      ['Carro', false],
    ])
  })

  it('reports lines it cannot read instead of guessing', () => {
    const result = mapCsvRecords(
      [
        ['Data', 'Descrição', 'Valor'],
        ['31/02/2026', 'X', '-1,00'],
        ['05/01/2026', '', '-1,00'],
        ['05/01/2026', 'Y', 'abc'],
        ['05/01/2026', 'Z', '-1.00'],
        ['05/01/2026', 'OK', '-1,00'],
      ],
      base
    )

    expect(result.rows).toHaveLength(1)
    expect(result.invalidCount).toBe(4)
    expect(result.invalid).toEqual([
      { line: 2, reason: 'date' },
      { line: 3, reason: 'description' },
      { line: 4, reason: 'amount' },
      { line: 5, reason: 'amount' },
    ])
  })
})

describe('readCsvFile', () => {
  const csv = Uint8Array.from(
    Buffer.from(
      'Data;Descrição;Valor\n05/01/2026;A;-1,00\n06/01/2026;B;-2,00\n'
    )
  )

  it('answers headers and a sample while the file has no mapping', () => {
    const read = readCsvFile(csv, {
      mapping: undefined,
      encoding: 'auto',
      delimiter: 'auto',
    })

    expect(read.parsed).toBeNull()
    expect(read.headers).toEqual(['Data', 'Descrição', 'Valor'])
    expect(read.sample).toHaveLength(2)
  })

  it('refuses an empty file and one past 5,000 rows', () => {
    const options = {
      mapping: base,
      encoding: 'auto',
      delimiter: 'auto',
    } as const

    expect(() => readCsvFile(new Uint8Array(), options)).toThrow(/empty/)

    const line = '05/01/2026,A,"-1,00"\n'
    const rows = `Data,Descrição,Valor\n${line.repeat(5001)}`

    expect(() =>
      readCsvFile(Uint8Array.from(Buffer.from(rows)), options)
    ).toThrow(/at most 5000 rows/)
    expect(
      readCsvFile(
        Uint8Array.from(
          Buffer.from(`Data,Descrição,Valor\n${line.repeat(5000)}`)
        ),
        options
      ).parsed?.rows
    ).toHaveLength(5000)
  })
})
