import { describe, expect, it } from 'vitest'

import { monthWindow } from './month-window.js'

describe('monthWindow', () => {
  it('spans the first to the last day of the month', () => {
    expect(monthWindow('2026-10-19')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })
  })

  it('ends February on the 29th in a leap year', () => {
    expect(monthWindow('2028-02-10')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })
})
