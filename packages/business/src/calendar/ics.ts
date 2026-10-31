import { shiftDay } from '../calc/recurrence.js'

export interface IcsEvent {
  uid: string
  date: string
  summary: string
  description?: string
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function fold(line: string): string[] {
  const lines: string[] = []
  let current = ''
  let bytes = 0

  for (const char of line) {
    const size = Buffer.byteLength(char)
    const limit = lines.length === 0 ? 75 : 74

    if (bytes + size > limit) {
      lines.push(current)
      current = ''
      bytes = 0
    }

    current += char
    bytes += size
  }

  lines.push(current)

  return lines.map((text, index) => (index === 0 ? text : ` ${text}`))
}

function icsDate(day: string): string {
  return day.replaceAll('-', '')
}

function icsStamp(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

export function buildIcs(
  events: readonly IcsEvent[],
  now: Date,
  calendarName: string
): string {
  const stamp = icsStamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kantim//Upcoming//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(event.date)}`,
      `DTEND;VALUE=DATE:${icsDate(shiftDay(event.date, 1))}`,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description === undefined
        ? []
        : [`DESCRIPTION:${escapeText(event.description)}`]),
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')

  return `${lines.flatMap(fold).join('\r\n')}\r\n`
}
