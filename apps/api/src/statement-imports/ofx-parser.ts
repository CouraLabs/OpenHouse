import { parseLocalizedAmount, toIsoDay } from '@workspace/poco'

/** One `STMTTRN` of an OFX statement. */
export interface OfxTransaction {
  /** `TRNTYPE`: DEBIT, CREDIT, PAYMENT, … — empty when absent. */
  kind: string
  /** The posted day, `YYYY-MM-DD`. */
  postedOn: string
  /** `TRNAMT` as a signed money string: negative is money out. */
  amount: string
  /** `FITID`, the bank's id for the row, or nothing when it has none. */
  fitId: string | null
  /** `NAME`, else `MEMO`. */
  name: string
  /** `MEMO` when it adds to a different `NAME`. */
  memo: string | null
}

/** An OFX file read into its rows. */
export interface OfxStatement {
  /** Whether it is a bank (`STMTRS`) or a credit card (`CCSTMTRS`)
   * statement, or neither was declared. */
  kind: 'bank' | 'card' | 'unknown'
  /** Every `CURDEF` the file declares, upper-cased. */
  currencies: string[]
  transactions: OfxTransaction[]
  /** How many `STMTTRN` could not be read (no day or amount). */
  invalid: number
}

/** Raised for text that is not an OFX file at all. */
export class OfxFormatError extends Error {
  constructor() {
    super('This file is not a valid OFX statement.')
    this.name = 'OfxFormatError'
  }
}

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9_.]*)\s*>([^<]*)/g

/**
 * Reads OFX text, both the SGML of OFX 1.x (leaf tags without closing tags,
 * a plain-text header before `<OFX>`) and the XML of OFX 2.x. The reader is a
 * tolerant tokenizer over tags — it never builds a DOM, resolves entities
 * beyond the five predefined ones and numeric references, or evaluates
 * anything, so a hostile file can do no more than yield odd rows.
 *
 * Money out is negative in a bank statement and a charge is negative in a
 * credit card one (`CCSTMTRS`), payments and refunds positive — the same
 * sign rule, so the amount's sign alone says the direction.
 */
export function parseOfx(text: string): OfxStatement {
  const start = text.search(/<OFX[\s>]/i)

  if (start === -1) {
    throw new OfxFormatError()
  }

  const statement: OfxStatement = {
    kind: 'unknown',
    currencies: [],
    transactions: [],
    invalid: 0,
  }
  let current: Record<string, string> | null = null
  const flush = () => {
    if (current !== null) {
      const row = readTransaction(current)

      if (row === null) {
        statement.invalid++
      } else {
        statement.transactions.push(row)
      }

      current = null
    }
  }

  TAG.lastIndex = start

  for (const match of text.matchAll(TAG)) {
    if (match.index < start) {
      continue
    }

    const closing = match[1] === '/'
    const tag = match[2].toUpperCase()
    const value = decodeEntities(match[3].trim())

    if (tag === 'STMTTRN') {
      flush()

      if (!closing) {
        current = {}
      }

      continue
    }

    if (closing) {
      if (tag === 'BANKTRANLIST' || tag === 'CCSTMTRS' || tag === 'STMTRS') {
        flush()
      }

      continue
    }

    if (tag === 'CCSTMTRS' || tag === 'CCSTMTTRNRS') {
      statement.kind = 'card'
    } else if (tag === 'STMTRS' && statement.kind === 'unknown') {
      statement.kind = 'bank'
    }

    if (tag === 'CURDEF' && value !== '') {
      const currency = value.toUpperCase()

      if (!statement.currencies.includes(currency)) {
        statement.currencies.push(currency)
      }
    }

    if (current !== null && value !== '' && !(tag in current)) {
      current[tag] = value
    }
  }

  flush()

  return statement
}

/** Reads the collected tags of one `STMTTRN`, or `null` when it lacks a
 * valid day or amount. A zero amount moves nothing and is dropped as well. */
function readTransaction(
  fields: Record<string, string>
): OfxTransaction | null {
  const posted = /^(\d{4})(\d{2})(\d{2})/.exec(fields.DTPOSTED ?? '')
  const postedOn =
    posted === null
      ? null
      : toIsoDay(Number(posted[1]), Number(posted[2]), Number(posted[3]))
  const amount = parseOfxAmount(fields.TRNAMT ?? '')

  if (postedOn === null || amount === null || amount === '0.00') {
    return null
  }

  const name = fields.NAME ?? fields.MEMO ?? ''
  const memo =
    fields.MEMO !== undefined &&
    fields.NAME !== undefined &&
    fields.MEMO !== fields.NAME
      ? fields.MEMO
      : null

  return {
    kind: (fields.TRNTYPE ?? '').toUpperCase(),
    postedOn,
    amount,
    fitId:
      fields.FITID === undefined || fields.FITID === '' ? null : fields.FITID,
    name,
    memo,
  }
}

/** `TRNAMT` uses a dot by the spec, but Brazilian exporters write a comma:
 * whichever separator comes last is the decimal one. */
function parseOfxAmount(text: string): string | null {
  const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.'

  return parseLocalizedAmount(text, decimal)
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

/** Decodes the five predefined entities and numeric references; any other
 * entity stays as written. */
function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (whole, body: string) => {
      if (body[0] === '#') {
        const code =
          body[1].toLowerCase() === 'x'
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10)

        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
      }

      return ENTITIES[body.toLowerCase()] ?? whole
    }
  )
}
