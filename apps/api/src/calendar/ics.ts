import { shiftDay } from '@workspace/poco'

/** One all-day event of the feed. */
export interface IcsEvent {
  /** A stable id, so a calendar updates an event instead of duplicating it. */
  uid: string
  /** The day, `YYYY-MM-DD`. */
  date: string
  summary: string
  description?: string
}

/** Escapes a TEXT value (RFC 5545 section 3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Folds a content line to 75 octets, continuation lines led by a space
 * (RFC 5545 section 3.1), never splitting a multi-byte character. */
function fold(line: string): string[] {
  const lines: string[] = []
  let current = ''
  let bytes = 0

  for (const char of line) {
    const size = Buffer.byteLength(char)
    // A continuation line spends one octet on its leading space.
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

/** `YYYY-MM-DD` as the `YYYYMMDD` of an iCalendar DATE. */
function icsDate(day: string): string {
  return day.replaceAll('-', '')
}

/** An instant as an iCalendar UTC DATE-TIME. */
function icsStamp(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/**
 * Renders an iCalendar feed of all-day events. Pure: the clock is an
 * argument. An all-day event ends the day after it starts (`DTEND` is
 * exclusive), and lines are CRLF-terminated and folded, as calendar apps
 * require.
 */
export function buildIcs(
  events: readonly IcsEvent[],
  now: Date,
  calendarName: string
): string {
  const stamp = icsStamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenHouse//Upcoming//EN',
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
