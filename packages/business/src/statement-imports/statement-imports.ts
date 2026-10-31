import {
  formatCents,
  MAX_INSTALLMENTS,
  toCents,
  type ImportDateFormat,
  type ImportDecimalSeparator,
  type InstallmentMarker,
} from "@workspace/domain"

export type { ImportDateFormat, ImportDecimalSeparator, InstallmentMarker }

export function parseLocalizedAmount(
  text: string,
  decimalSeparator: ImportDecimalSeparator
): string | null {
  let value = text
    .replace(/\s/g, "")
    .replace(/^(?:R\$|US\$|U\$|\$|€|EUR|USD|BRL)/i, "")

  let negative = false

  if (/^\(.*\)$/.test(value)) {
    negative = true
    value = value.slice(1, -1)
  }

  if (value.endsWith("-")) {
    negative = !negative
    value = value.slice(0, -1)
  }

  if (value.startsWith("-")) {
    negative = !negative
    value = value.slice(1)
  } else if (value.startsWith("+")) {
    value = value.slice(1)
  }

  value = value.replace(/^(?:R\$|US\$|U\$|\$|€)/i, "")

  const thousands = decimalSeparator === "," ? "\\." : ","
  const decimal = decimalSeparator === "," ? "," : "\\."
  const shape = new RegExp(
    `^(\\d{1,3}(?:${thousands}\\d{3})+|\\d+)(?:${decimal}(\\d+))?$`
  )
  const match = shape.exec(value)

  if (match === null) {
    return null
  }

  const whole = match[1].replace(new RegExp(thousands, "g"), "")
  const fraction = match[2] ?? ""

  if (fraction.length > 2 && /[1-9]/.test(fraction.slice(2))) {
    return null
  }

  const magnitude = formatCents(
    toCents(`${whole}.${`${fraction}00`.slice(0, 2)}`)
  )

  return negative && magnitude !== "0.00" ? `-${magnitude}` : magnitude
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

  if (format === "YYYY-MM-DD") {
    ;[year, month, day] = [first, second, third]
  } else if (format === "DD/MM/YYYY") {
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

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function normalizeImportText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
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
          " " +
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
