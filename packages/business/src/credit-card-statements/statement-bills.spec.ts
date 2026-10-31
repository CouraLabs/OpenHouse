import { describe, expect, it, vi } from 'vitest'
import type { StatementTarget } from '@workspace/db'

import { StatementBills, sortStatementRows } from './statement-bills.js'
import type { StatementTotalsRow } from './statement-view.js'

const row = (
  overrides: Partial<StatementTotalsRow> = {}
): StatementTotalsRow => ({
  id: 4,
  accountId: 9,
  accountName: 'Visa',
  currency: 'BRL',
  closeDayInclusive: false,
  periodStart: '2026-09-25',
  closeDate: '2026-10-25',
  dueDate: '2026-11-05',
  closedAt: null,
  minimumDue: null,
  bankTotal: null,
  reconciledAt: null,
  transactionCount: 3,
  paymentCount: 0,
  charges: '300.00',
  credits: '0.00',
  total: '300.00',
  paid: '0.00',
  previousBalance: '0.00',
  nextDueDate: null,
  ...overrides,
})

const september = row({
  id: 3,
  periodStart: '2026-08-25',
  closeDate: '2026-09-25',
  dueDate: '2026-10-05',
  total: '100.00',
  paid: '100.00',
})
const october = row({ id: 4, total: '300.00' })
const empty = row({
  id: 5,
  closeDate: '2026-11-25',
  dueDate: '2026-12-05',
  transactionCount: 0,
  total: '0.00',
})

function bills(
  rows: StatementTotalsRow[],
  options: { today?: string; target?: StatementTarget } = {}
) {
  const statements = {
    listTotals: vi.fn(async () => rows),
    ensureBill: vi.fn(async () => 77),
  }
  const placer = {
    place: vi.fn(
      async (): Promise<StatementTarget> =>
        options.target ?? { kind: 'none' }
    ),
  }

  return {
    statements,
    service: new StatementBills(statements, placer, {
      of: async () => options.today ?? '2026-10-30',
    }),
  }
}

describe('sortStatementRows', () => {
  it('orders by each clause, then by id', () => {
    const rows = [october, september, row({ id: 2, total: '300.00' })]

    expect(
      sortStatementRows(rows, [{ field: 'total', dir: 'desc' }]).map(
        (bill) => bill.id
      )
    ).toEqual([2, 4, 3])
    expect(sortStatementRows(rows, []).map((bill) => bill.id)).toEqual([
      2, 3, 4,
    ])
  })

  it('ignores a field it cannot sort by', () => {
    expect(
      sortStatementRows([october, september], [
        { field: 'unknown', dir: 'asc' },
      ]).map((bill) => bill.id)
    ).toEqual([3, 4])
  })
})

describe('StatementBills.search', () => {
  it('hides bills without activity and filters by derived status', async () => {
    const { service } = bills([september, october, empty])

    const all = await service.search(1, {
      sort: [],
      filter: {},
      skip: 0,
      limit: 10,
    })
    const closed = await service.search(1, {
      sort: [],
      filter: { status: ['Closed'] },
      skip: 0,
      limit: 10,
    })

    expect(all.rows.map((bill) => bill.id)).toEqual([3, 4])
    expect(closed.rows.map((bill) => bill.id)).toEqual([4])
    expect(closed.total).toBe(1)
  })

  it('pages after sorting and counts every match', async () => {
    const { service } = bills([september, october])

    const page = await service.search(1, {
      sort: [{ field: 'closeDate', dir: 'desc' }],
      filter: {},
      skip: 1,
      limit: 1,
    })

    expect(page.rows.map((bill) => bill.id)).toEqual([3])
    expect(page.total).toBe(2)
    expect(page.today).toBe('2026-10-30')
  })
})

describe('StatementBills.pending', () => {
  it('lists unpaid bills due by the given day, oldest due first', async () => {
    const { service, statements } = bills([october, september, empty])

    const pending = await service.pending(1, '2026-11-30')

    expect(pending.map((bill) => bill.id)).toEqual([4])
    expect(statements.listTotals).toHaveBeenCalledWith(1, {
      activeAccountsOnly: true,
    })
  })
})

describe('StatementBills.unpaidSummary', () => {
  it('counts unpaid bills and reads the amount due off the latest', async () => {
    const { service } = bills([october, september])

    await expect(service.unpaidSummary(1, 9)).resolves.toEqual({
      unpaidBills: 1,
      amountDue: '300.00',
      currency: 'BRL',
    })
  })

  it('answers nothing owed for a card without bills', async () => {
    const { service } = bills([])

    await expect(service.unpaidSummary(1, 9)).resolves.toEqual({
      unpaidBills: 0,
      amountDue: '0.00',
      currency: 'USD',
    })
  })
})

describe('StatementBills.defaultPaymentStatementId', () => {
  it('pays the oldest unpaid bill first', async () => {
    const { service, statements } = bills([september, october])

    await expect(service.defaultPaymentStatementId(1, 7, 9)).resolves.toBe(4)
    expect(statements.ensureBill).not.toHaveBeenCalled()
  })

  it("creates today's bill when the card has none to pay", async () => {
    const target: StatementTarget = {
      kind: 'bill',
      accountId: 9,
      window: {
        periodStart: '2026-10-25',
        closeDate: '2026-11-25',
        dueDate: '2026-12-05',
      },
      closed: false,
      pinned: false,
    }
    const { service, statements } = bills([], { target })

    await expect(service.defaultPaymentStatementId(1, 7, 9)).resolves.toBe(77)
    expect(statements.ensureBill).toHaveBeenCalledWith(1, 7, target)
  })

  it('answers no bill for an account without a card cycle', async () => {
    const { service } = bills([])

    await expect(
      service.defaultPaymentStatementId(1, 7, 9)
    ).resolves.toBeNull()
  })
})
