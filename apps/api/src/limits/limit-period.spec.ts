import { describe, expect, it } from 'vitest'
import type { LimitType } from '@workspace/poco'

import { periodWindow } from './limit-period.js'

/** The types the windows cover, and the days the windows are asked about:
 * a mid-month Wednesday, a month's first day, and a leap year's February. */
const TYPES: LimitType[] = ['Daily', 'Weekly', 'Monthly', 'Yearly']

describe('periodWindow', () => {
  it('covers only the day itself for a Daily limit', () => {
    expect(periodWindow('Daily', '2026-10-14')).toEqual({
      from: '2026-10-14',
      to: '2026-10-14',
    })
  })

  it('covers the Monday-based week for a Weekly limit', () => {
    // October 14, 2026 is a Wednesday: the week runs Mon 12 – Sun 18.
    expect(periodWindow('Weekly', '2026-10-14')).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    })

    // The Sunday of the same week stays inside it.
    expect(periodWindow('Weekly', '2026-10-18')).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    })
  })

  it('covers the calendar month for a Monthly limit', () => {
    expect(periodWindow('Monthly', '2026-10-14')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })

    // A month's last day is its own end.
    expect(periodWindow('Monthly', '2026-02-28')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('covers the calendar year for a Yearly limit', () => {
    expect(periodWindow('Yearly', '2026-10-14')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    })
  })

  it('keeps every window inside the year it is asked about', () => {
    for (const type of TYPES) {
      const window = periodWindow(type, '2026-10-14')

      expect(window.from.startsWith('2026-')).toBe(true)
      expect(window.to.startsWith('2026-')).toBe(true)
      expect(window.from <= window.to).toBe(true)
    }
  })
})
