import { describe, expect, it } from 'vitest'

import { decodeImportBytes, ofxEncodingHint } from './import-decoder.js'
import { readOfxFile } from './import-file-reader.js'
import { OfxFormatError, parseOfx } from './ofx-parser.js'
import { BANK_OFX_SGML, CARD_OFX_XML } from './ofx-samples.fixture-spec.js'

/** Runs `read` and answers the payload of the `DomainError` it raises. */
function errorPayloadOf(read: () => unknown): unknown {
  try {
    read()
  } catch (error) {
    return (error as { payload: unknown }).payload
  }

  return expect.unreachable('the read was expected to fail')
}

describe('parseOfx', () => {
  it('reads an OFX 1.x SGML bank statement', () => {
    const statement = parseOfx(BANK_OFX_SGML)

    expect(statement.kind).toBe('bank')
    expect(statement.currencies).toEqual(['BRL'])
    expect(statement.transactions).toEqual([
      {
        kind: 'DEBIT',
        postedOn: '2026-01-05',
        amount: '-45.90',
        fitId: '2026010501',
        name: 'PADARIA PÃO QUENTE',
        memo: null,
      },
      {
        kind: 'CREDIT',
        postedOn: '2026-01-06',
        amount: '3500.00',
        fitId: '2026010602',
        name: 'SALÁRIO',
        memo: 'CRÉDITO SALÁRIO JANEIRO',
      },
      {
        kind: 'DEBIT',
        postedOn: '2026-01-08',
        amount: '-1234.56',
        fitId: '2026010803',
        name: 'AÇOUGUE & CIA',
        memo: null,
      },
    ])
  })

  it('reads an OFX 2.x XML credit card statement (CCSTMTRS)', () => {
    const statement = parseOfx(CARD_OFX_XML)

    expect(statement.kind).toBe('card')
    expect(statement.transactions.map((row) => row.amount)).toEqual([
      '-89.90',
      '-250.00',
      '30.00',
      '1500.00',
    ])
    expect(statement.transactions[3].kind).toBe('PAYMENT')
  })

  it('counts rows without a day or an amount, and drops zero amounts', () => {
    const statement = parseOfx(
      `<OFX><STMTRS><CURDEF>USD<BANKTRANLIST>
       <STMTTRN><DTPOSTED>20260231<TRNAMT>-1.00<FITID>a</STMTTRN>
       <STMTTRN><DTPOSTED>20260105<TRNAMT>oops<FITID>b</STMTTRN>
       <STMTTRN><DTPOSTED>20260105<TRNAMT>0.00<FITID>c</STMTTRN>
       <STMTTRN><DTPOSTED>20260105<TRNAMT>-2.50<FITID>d<NAME>Coffee</STMTTRN>
       </BANKTRANLIST></STMTRS></OFX>`
    )

    expect(statement.invalid).toBe(3)
    expect(statement.transactions).toHaveLength(1)
    expect(statement.transactions[0].fitId).toBe('d')
  })

  it('never evaluates entities or markup it does not know', () => {
    const statement = parseOfx(
      `<!DOCTYPE x [<!ENTITY boom "BOOM">]><OFX><STMTRS><CURDEF>USD<BANKTRANLIST>
       <STMTTRN><DTPOSTED>20260105<TRNAMT>-2.50<FITID>d<NAME>&boom; &#65; &amp;</STMTTRN>
       </BANKTRANLIST></STMTRS></OFX>`
    )

    expect(statement.transactions[0].name).toBe('&boom; A &')
  })

  it('rejects text that is not OFX', () => {
    expect(() => parseOfx('date,desc,amount\n')).toThrow(OfxFormatError)
  })
})

describe('OFX encodings', () => {
  const latin1 = (text: string) => Uint8Array.from(Buffer.from(text, 'latin1'))

  it('honors the CHARSET header: Latin-1 / Windows-1252 accents survive', () => {
    const bytes = latin1(BANK_OFX_SGML)

    expect(ofxEncodingHint(bytes)).toBe('windows-1252')

    const read = readOfxFile(bytes)

    expect(read.encoding).toBe('windows-1252')
    expect(read.parsed?.rows.map((row) => row.name)).toEqual([
      'PADARIA PÃO QUENTE',
      'SALÁRIO',
      'AÇOUGUE & CIA',
    ])
  })

  it('reads ISO-8859-1 declared as such', () => {
    const bytes = latin1(
      BANK_OFX_SGML.replace('CHARSET:1252', 'CHARSET:ISO-8859-1')
    )

    expect(ofxEncodingHint(bytes)).toBe('windows-1252')
    expect(readOfxFile(bytes).parsed?.rows[0].name).toBe('PADARIA PÃO QUENTE')
  })

  it('reads the Windows-1252-only characters (curly quote, euro)', () => {
    const bytes = Uint8Array.from([0x93, 0x80, 0x94, 0x92])

    expect(decodeImportBytes(bytes, 'windows-1252').text).toBe('“€”’')
  })

  it('reads UTF-8 when the header says so or the bytes are UTF-8', () => {
    const utf8 = Uint8Array.from(
      Buffer.from(CARD_OFX_XML.replace('Uber *Trip', 'Café São João'), 'utf8')
    )

    expect(ofxEncodingHint(utf8)).toBe('utf-8')
    expect(readOfxFile(utf8).parsed?.rows[0].name).toBe('Café São João')

    const noHeader = Uint8Array.from(
      Buffer.from(BANK_OFX_SGML.replace('CHARSET:1252', 'CHARSET:NONE'), 'utf8')
    )

    expect(ofxEncodingHint(noHeader)).toBe('auto')
    expect(readOfxFile(noHeader).encoding).toBe('utf-8')
  })

  it('falls back to Windows-1252 for undeclared non-UTF-8 bytes', () => {
    const bytes = latin1(BANK_OFX_SGML.replace('CHARSET:1252', 'CHARSET:NONE'))

    expect(readOfxFile(bytes).encoding).toBe('windows-1252')
    expect(readOfxFile(bytes).parsed?.rows[1].name).toBe('SALÁRIO')
  })
})

describe('readOfxFile sign convention', () => {
  it('maps card charges to Expense and refunds or payments to Income', () => {
    const read = readOfxFile(Uint8Array.from(Buffer.from(CARD_OFX_XML)))
    const rows = read.parsed?.rows ?? []

    expect(read.statementKind).toBe('card')
    expect(rows.map((row) => [row.type, row.amount])).toEqual([
      ['Expense', '89.90'],
      ['Expense', '250.00'],
      ['Income', '30.00'],
      ['Income', '1500.00'],
    ])
    expect(rows.map((row) => row.paymentHint)).toEqual([
      false,
      false,
      false,
      true,
    ])
    expect(rows[0].externalId).toBe('CC-1')
  })

  it('maps a bank statement by the same sign rule', () => {
    const rows = readOfxFile(
      Uint8Array.from(Buffer.from(BANK_OFX_SGML, 'latin1'))
    ).parsed?.rows
    expect(rows?.map((row) => row.type)).toEqual([
      'Expense',
      'Income',
      'Expense',
    ])
    expect(rows?.[0].amount).toBe('45.90')
  })

  it('refuses a file with more than 5,000 rows', () => {
    const row = '<STMTTRN><DTPOSTED>20260105<TRNAMT>-1.00<FITID>x</STMTTRN>'
    const big = `<OFX><STMTRS><CURDEF>USD<BANKTRANLIST>${row.repeat(5001)}</BANKTRANLIST></STMTRS></OFX>`

    expect(errorPayloadOf(() => readOfxFile(Uint8Array.from(Buffer.from(big))))).toMatch(
      /at most 5000 rows/
    )
  })
})
