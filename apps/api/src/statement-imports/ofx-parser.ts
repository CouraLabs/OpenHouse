import { parseLocalizedAmount, toIsoDay } from '@workspace/poco'

export interface OfxTransaction {
  kind: string
  postedOn: string
  amount: string
  fitId: string | null
  name: string
  memo: string | null
}

export interface OfxStatement {
  kind: 'bank' | 'card' | 'unknown'
  currencies: string[]
  transactions: OfxTransaction[]
  invalid: number
}

export class OfxFormatError extends Error {
  constructor() {
    super('This file is not a valid OFX statement.')
    this.name = 'OfxFormatError'
  }
}

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9_.]*)\s*>([^<]*)/g

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
