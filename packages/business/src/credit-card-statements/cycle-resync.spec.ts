import { describe, expect, it } from 'vitest'

import { type OpenStatement, planCycleResync } from './cycle-resync.js'

const open: OpenStatement = {
  id: 1,
  periodStart: '2026-10-25',
  closeDate: '2026-11-25',
  dueDate: '2026-12-05',
}

describe('planCycleResync', () => {
  it('updates the due date in place when only the due day changed', () => {
    const plan = planCycleResync(
      { closeDay: 25, dueDay: 10, closeDayInclusive: false },
      [open],
      [{ id: 10, transactionDt: '2026-11-02' }],
      new Set()
    )

    expect(plan.windowUpdates).toEqual([
      { id: 1, periodStart: '2026-10-25', dueDate: '2026-12-10' },
    ])
    expect(plan.assignments).toEqual([
      {
        window: {
          periodStart: '2026-10-25',
          closeDate: '2026-11-25',
          dueDate: '2026-12-10',
        },
        transactionIds: [10],
      },
    ])
    expect(plan.orphanIds).toEqual([])
  })

  it('moves charges to the new closes and orphans the old bill', () => {
    const plan = planCycleResync(
      { closeDay: 20, dueDay: 1, closeDayInclusive: false },
      [open],
      [
        { id: 10, transactionDt: '2026-11-02' },
        { id: 11, transactionDt: '2026-11-22' },
      ],
      new Set()
    )

    expect(plan.windowUpdates).toEqual([])
    expect(
      plan.assignments.map((group) => [
        group.window.closeDate,
        group.transactionIds,
      ])
    ).toEqual([
      ['2026-11-20', [10]],
      ['2026-12-20', [11]],
    ])
    expect(plan.orphanIds).toEqual([1])
  })

  it('never orphans a bill that holds pinned charges', () => {
    const plan = planCycleResync(
      { closeDay: 20, dueDay: 1, closeDayInclusive: false },
      [open],
      [],
      new Set([1])
    )

    expect(plan.orphanIds).toEqual([])
  })

  it('assigns charges that had no bill yet', () => {
    const plan = planCycleResync(
      { closeDay: 25, dueDay: 5, closeDayInclusive: false },
      [],
      [{ id: 12, transactionDt: '2026-09-30' }],
      new Set()
    )

    expect(plan.assignments[0].window.closeDate).toBe('2026-10-25')
  })

  it('moves the boundary when the close day turns inclusive', () => {
    const plan = planCycleResync(
      { closeDay: 25, dueDay: 5, closeDayInclusive: true },
      [open],
      [{ id: 13, transactionDt: '2026-11-25' }],
      new Set()
    )

    expect(plan.assignments[0].window.closeDate).toBe('2026-11-26')
    expect(plan.orphanIds).toEqual([1])
  })
})
