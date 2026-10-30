const MAX_WHOLE_DIGITS = 14
const MAX_FRACTION_DIGITS = 2

function groupSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale)
      .formatToParts(1111)
      .find((part) => part.type === 'group')?.value ?? ','
  )
}

function decimalSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value ?? '.'
  )
}

function decimalIndex(text: string, locale: string): number {
  const dot = text.lastIndexOf('.')
  const comma = text.lastIndexOf(',')
  const last = Math.max(dot, comma)

  if (last === -1) {
    return -1
  }

  const separator = text[last]!
  const other = separator === '.' ? ',' : '.'

  if (text.includes(other)) {
    return text.indexOf(other) > last ? -1 : last
  }

  if (text.indexOf(separator) !== last) {
    return -1
  }

  const trailing = text.length - last - 1

  if (trailing === 3 && separator === groupSeparator(locale)) {
    return -1
  }

  return last
}

export function parseInput(raw: string, locale = 'en-US'): string {
  const negative = raw.includes('-')
  const text = raw.replace(/[^\d.,]/g, '')
  const at = decimalIndex(text, locale)
  const wholeText = (at === -1 ? text : text.slice(0, at)).replace(/\D/g, '')
  const fractionText = at === -1 ? '' : text.slice(at + 1).replace(/\D/g, '')

  if (wholeText === '' && fractionText === '') {
    return ''
  }

  const whole = wholeText.slice(0, MAX_WHOLE_DIGITS).replace(/^0+(?=\d)/, '')
  const fraction = fractionText
    .slice(0, MAX_FRACTION_DIGITS)
    .padEnd(MAX_FRACTION_DIGITS, '0')
  const amount = `${whole === '' ? '0' : whole}.${fraction}`
  const isZero = /^0\.00$/.test(amount)

  return negative && !isZero ? `-${amount}` : amount
}

export function formatInput(value: string | undefined, locale: string): string {
  if (value === undefined || value === '') {
    return ''
  }

  const negative = value.startsWith('-')
  const [whole = '0', fraction = '00'] = value.replace('-', '').split('.')
  const grouped = new Intl.NumberFormat(locale).format(BigInt(whole))

  return `${negative ? '-' : ''}${grouped}${decimalSeparator(locale)}${fraction}`
}
