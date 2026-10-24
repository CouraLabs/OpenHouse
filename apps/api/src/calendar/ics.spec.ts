import { buildIcs } from './ics.js'

const now = new Date('2026-10-24T12:00:00.000Z')

describe('buildIcs', () => {
  it('renders an all-day event ending the day after it starts', () => {
    const ics = buildIcs(
      [{ uid: 'bill-7@openhouse', date: '2026-11-30', summary: 'Nubank bill' }],
      now,
      'OpenHouse'
    )

    expect(ics).toContain('BEGIN:VEVENT\r\n')
    expect(ics).toContain('UID:bill-7@openhouse\r\n')
    expect(ics).toContain('DTSTAMP:20261024T120000Z\r\n')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261130\r\n')
    // The end of an all-day event is exclusive and crosses the month.
    expect(ics).toContain('DTEND;VALUE=DATE:20261201\r\n')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('escapes text values', () => {
    const ics = buildIcs(
      [
        {
          uid: 'a',
          date: '2026-11-01',
          summary: 'Rent, utilities; misc',
          description: 'Line one\nLine two',
        },
      ],
      now,
      'OpenHouse'
    )

    expect(ics).toContain('SUMMARY:Rent\\, utilities\\; misc\r\n')
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\r\n')
  })

  it('folds long lines at 75 octets without splitting a character', () => {
    const ics = buildIcs(
      [{ uid: 'a', date: '2026-11-01', summary: 'ç'.repeat(80) }],
      now,
      'OpenHouse'
    )

    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
    }
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'ç'.repeat(80)}`)
  })
})
