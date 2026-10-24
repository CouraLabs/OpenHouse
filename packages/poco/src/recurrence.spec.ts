import { describe, expect, it } from 'vitest'

import { isDueOn, occurrencesBetween, shiftDay } from './recurrence.js'

describe('isDueOn', () => {
  it('is due every day', () => {
    expect(
      isDueOn(
        { frequency: 'Daily', frequencyDay: null, frequencyMonth: null },
        '2026-10-14'
      )
    ).toBe(true)
    expect(
      isDueOn(
        { frequency: 'Daily', frequencyDay: null, frequencyMonth: null },
        '2027-02-28'
      )
    ).toBe(true)
  })

  it('matches the ISO weekday, Monday first', () => {
    const weekly = (day: number) => ({
      frequency: 'Weekly' as const,
      frequencyDay: day,
      frequencyMonth: null,
    })

    // 2026-10-14 is a Wednesday (ISO weekday 3).
    expect(isDueOn(weekly(3), '2026-10-14')).toBe(true)
    expect(isDueOn(weekly(1), '2026-10-14')).toBe(false)
    expect(isDueOn(weekly(7), '2026-10-18')).toBe(true)
  })

  it('matches the day of the month', () => {
    const monthly = {
      frequency: 'Monthly' as const,
      frequencyDay: 14,
      frequencyMonth: null,
    }

    expect(isDueOn(monthly, '2026-10-14')).toBe(true)
    expect(isDueOn(monthly, '2026-10-15')).toBe(false)
  })

  it("clamps a day past the month's end to the last day", () => {
    const monthly = {
      frequency: 'Monthly' as const,
      frequencyDay: 31,
      frequencyMonth: null,
    }

    // September has 30 days: the rule runs on the 30th.
    expect(isDueOn(monthly, '2026-09-30')).toBe(true)
    expect(isDueOn(monthly, '2026-09-29')).toBe(false)
    // October has 31: it runs on the 31st.
    expect(isDueOn(monthly, '2026-10-31')).toBe(true)
  })

  it('clamps February 29 to February 28 of a common year', () => {
    const yearly = {
      frequency: 'Yearly' as const,
      frequencyDay: 29,
      frequencyMonth: 2,
    }

    expect(isDueOn(yearly, '2028-02-29')).toBe(true)
    expect(isDueOn(yearly, '2027-02-28')).toBe(true)
    expect(isDueOn(yearly, '2027-02-27')).toBe(false)
  })

  it('matches the month and the day for a yearly rule', () => {
    const yearly = {
      frequency: 'Yearly' as const,
      frequencyDay: 25,
      frequencyMonth: 12,
    }

    expect(isDueOn(yearly, '2026-12-25')).toBe(true)
    expect(isDueOn(yearly, '2027-12-25')).toBe(true)
    expect(isDueOn(yearly, '2026-11-25')).toBe(false)
  })
})

describe('shiftDay', () => {
  it('shifts across month and year boundaries without losing a day', () => {
    expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30')
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31')
    expect(shiftDay('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('occurrencesBetween', () => {
  it('lists the due days of a window, inclusive of both ends', () => {
    const weekly = {
      frequency: 'Weekly' as const,
      frequencyDay: 1,
      frequencyMonth: null,
    }

    expect(occurrencesBetween(weekly, '2026-10-26', '2026-11-09')).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
    ])
  })
})
