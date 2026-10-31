import { describe, expect, it } from 'vitest'
import type { CardColumns } from '@workspace/db'

import { StatementPlacer } from './statement-placer.js'

const visa: CardColumns = {
  type: 'Credit Card',
  closeDay: 25,
  dueDay: 5,
  closeDayInclusive: false,
}

function placer(card: CardColumns | undefined, today = '2026-10-15') {
  return new StatementPlacer(
    { findCard: async () => card },
    { of: async () => today }
  )
}

const purchase = {
  linkedAccountId: 9,
  transactionDt: '2026-10-14',
  type: 'Expense' as const,
  isTransferLeg: false,
}

describe('StatementPlacer.place', () => {
  it("puts a card charge on the bill whose window holds the day", async () => {
    await expect(placer(visa).place(1, purchase)).resolves.toEqual({
      kind: 'bill',
      accountId: 9,
      window: {
        periodStart: '2026-09-25',
        closeDate: '2026-10-25',
        dueDate: '2026-11-05',
      },
      closed: false,
      pinned: false,
    })
  })

  it('moves an installment by its offset and pins it', async () => {
    const target = await placer(visa).place(1, purchase, {
      offset: 2,
      pinned: true,
    })

    expect(target).toMatchObject({
      kind: 'bill',
      window: { closeDate: '2026-12-25' },
      pinned: true,
    })
  })

  it('marks the bill closed once today reaches its close date', async () => {
    await expect(
      placer(visa, '2026-10-25').place(1, purchase)
    ).resolves.toMatchObject({ kind: 'bill', closed: true })
  })

  it('puts no bill on a card payment, a non-card account, or a card without a cycle', async () => {
    await expect(
      placer(visa).place(1, { ...purchase, type: 'Income', isTransferLeg: true })
    ).resolves.toEqual({ kind: 'none' })
    await expect(
      placer({ ...visa, type: 'Checking' }).place(1, purchase)
    ).resolves.toEqual({ kind: 'none' })
    await expect(
      placer({ ...visa, dueDay: null }).place(1, purchase)
    ).resolves.toEqual({ kind: 'none' })
    await expect(placer(undefined).place(1, purchase)).resolves.toEqual({
      kind: 'none',
    })
  })
})

describe('StatementPlacer.replace', () => {
  const assigned = { ...purchase, statementId: 40, statementPinned: false }

  it('keeps the bill when nothing that places the row changed', async () => {
    await expect(
      placer(visa).replace(1, assigned, purchase)
    ).resolves.toEqual({ kind: 'keep', statementId: 40, statementPinned: false })
  })

  it('keeps a pinned row on its bill even when the day moves', async () => {
    await expect(
      placer(visa).replace(
        1,
        { ...assigned, statementPinned: true },
        { ...purchase, transactionDt: '2026-11-02' }
      )
    ).resolves.toEqual({ kind: 'keep', statementId: 40, statementPinned: true })
  })

  it('places the row again when its day changes', async () => {
    await expect(
      placer(visa).replace(1, assigned, {
        ...purchase,
        transactionDt: '2026-10-26',
      })
    ).resolves.toMatchObject({
      kind: 'bill',
      window: { closeDate: '2026-11-25' },
    })
  })
})
