import { describe, expect, it } from 'vitest'

import {
  addDays,
  cardCycleOf,
  cycleDaysDiffer,
  cycleGapWarning,
  daysBetween,
  displayCloseDate,
  resolveStatement,
  type CardCycle,
} from './credit-card-cycle.js'

const card = (
  closeDay: number,
  dueDay: number,
  closeDayInclusive = false
): CardCycle => ({ closeDay, dueDay, closeDayInclusive })

describe('resolveStatement', () => {
  // The verified examples of issue #5 §2.3. An inclusive card's closeDate is
  // the exclusive end of its period — the day after the bank's close day.
  it.each([
    [card(25, 5), '2026-10-10', '2026-10-25', '2026-11-05'],
    [card(25, 5), '2026-10-24', '2026-10-25', '2026-11-05'],
    [card(25, 5), '2026-10-25', '2026-11-25', '2026-12-05'],
    [card(25, 5, true), '2026-10-25', '2026-10-26', '2026-11-05'],
    [card(25, 5), '2026-10-26', '2026-11-25', '2026-12-05'],
    [card(3, 10), '2026-10-02', '2026-10-03', '2026-10-10'],
    [card(3, 10), '2026-10-03', '2026-11-03', '2026-11-10'],
    [card(26, 2), '2026-12-27', '2027-01-26', '2027-02-02'],
    [card(31, 8), '2027-02-15', '2027-02-28', '2027-03-08'],
    [card(31, 8), '2027-02-28', '2027-03-31', '2027-04-08'],
    [card(31, 8), '2027-04-30', '2027-05-31', '2027-06-08'],
    [card(30, 10), '2027-02-27', '2027-02-28', '2027-03-10'],
    [card(30, 10), '2028-02-29', '2028-03-30', '2028-04-10'],
  ])('%o on %s closes %s, due %s', (cycle, day, closeDate, dueDate) => {
    const window = resolveStatement(cycle, day)

    expect(window.closeDate).toBe(closeDate)
    expect(window.dueDate).toBe(dueDate)
  })

  it('starts the period where the previous one ended', () => {
    expect(resolveStatement(card(25, 5), '2026-10-10').periodStart).toBe(
      '2026-09-25'
    )
    expect(resolveStatement(card(31, 8), '2027-03-10').periodStart).toBe(
      '2027-02-28'
    )
    expect(resolveStatement(card(25, 5, true), '2026-10-10').periodStart).toBe(
      '2026-09-26'
    )
  })

  it('offsets whole cycles, never skipping a short month', () => {
    const closes = [0, 1, 2].map(
      (offset) => resolveStatement(card(30, 10), '2027-01-29', offset).closeDate
    )

    expect(closes).toEqual(['2027-01-30', '2027-02-28', '2027-03-30'])
  })

  it('offsets from the next bill when the purchase is on the close day', () => {
    expect(resolveStatement(card(25, 5), '2026-10-25', 1).closeDate).toBe(
      '2026-12-25'
    )
  })

  it('never falls due before an inclusive period ends', () => {
    // Close 30 inclusive, due 31: February clamps both days onto the 28th.
    const window = resolveStatement(card(30, 31, true), '2027-02-10')

    expect(window.closeDate).toBe('2027-03-01')
    expect(window.dueDate).toBe('2027-03-01')
  })

  it('maps every day of 2026–2028 to exactly one contiguous period', () => {
    const cycles = [
      card(1, 10),
      card(3, 10),
      card(15, 25),
      card(25, 5),
      card(28, 7),
      card(29, 8, true),
      card(30, 10),
      card(31, 8),
      card(31, 8, true),
      card(26, 2, true),
    ]

    for (const cycle of cycles) {
      let previous = resolveStatement(cycle, '2026-01-01')

      for (let day = '2026-01-01'; day <= '2028-12-31'; day = addDays(day, 1)) {
        const window = resolveStatement(cycle, day)

        expect(window.periodStart <= day && day < window.closeDate).toBe(true)
        expect(window.dueDate >= window.closeDate).toBe(true)

        if (window.closeDate !== previous.closeDate) {
          // The next period starts exactly where the last one ended.
          expect(window.periodStart).toBe(previous.closeDate)
        }

        previous = window
      }
    }
  })
})

describe('displayCloseDate', () => {
  it('shows the bank close day of an inclusive card', () => {
    expect(
      displayCloseDate({ closeDayInclusive: true }, { closeDate: '2026-10-26' })
    ).toBe('2026-10-25')
    expect(
      displayCloseDate(
        { closeDayInclusive: false },
        { closeDate: '2026-10-25' }
      )
    ).toBe('2026-10-25')
  })
})

describe('cardCycleOf', () => {
  it('is nothing while a day is unset', () => {
    expect(
      cardCycleOf({ closeDay: 25, dueDay: null, closeDayInclusive: false })
    ).toBeNull()
    expect(
      cardCycleOf({ closeDay: 25, dueDay: 5, closeDayInclusive: false })
    ).toEqual(card(25, 5))
  })
})

describe('cycle validation', () => {
  it('requires the close and due days to differ', () => {
    expect(cycleDaysDiffer(5, 5)).toBe(false)
    expect(cycleDaysDiffer(25, 5)).toBe(true)
  })

  it('warns on a gap that looks swapped', () => {
    expect(cycleGapWarning(25, 5)).toBeNull()
    expect(cycleGapWarning(3, 10)).toBeNull()
    expect(cycleGapWarning(10, 12)).toBe('short')
    expect(cycleGapWarning(5, 1)).toBe('long')
  })
})

describe('day arithmetic', () => {
  it('moves across months and years on calendar days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(daysBetween('2026-10-19', '2026-10-25')).toBe(6)
    expect(daysBetween('2026-10-25', '2026-10-19')).toBe(-6)
  })
})
