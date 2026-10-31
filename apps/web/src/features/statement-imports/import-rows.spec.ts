import { describe, expect, it } from 'vitest'
import type { ImportPreviewRow } from '@workspace/dto'

import {
  isSelectedByDefault,
  missingCategoryCount,
  resolveRows,
  toCommitRows,
} from './import-rows.js'

const row = (overrides: Partial<ImportPreviewRow> = {}): ImportPreviewRow => ({
  index: 0,
  name: 'Mercado',
  amount: '10.00',
  type: 'Expense',
  transactionDt: '2026-01-05',
  externalId: null,
  pending: false,
  categoryId: 3,
  categoryName: 'Groceries',
  receiverId: null,
  receiverName: null,
  suggestionSource: 'inferred',
  duplicate: null,
  billPayment: false,
  statement: null,
  installment: null,
  ...overrides,
})

const duplicate = (kind: 'external' | 'probable') => ({
  kind,
  transactionId: 1,
  name: 'x',
  transactionDt: '2026-01-05',
  amount: '10.00',
})

describe('isSelectedByDefault', () => {
  it('skips bill payments and rows already imported, keeps probable duplicates', () => {
    expect(isSelectedByDefault(row())).toBe(true)
    expect(isSelectedByDefault(row({ billPayment: true }))).toBe(false)
    expect(isSelectedByDefault(row({ duplicate: duplicate('external') }))).toBe(
      false
    )
    expect(isSelectedByDefault(row({ duplicate: duplicate('probable') }))).toBe(
      true
    )
  })
})

describe('resolveRows', () => {
  it('lets an edit win over the suggestion, and the suggestion over the fallback', () => {
    const rows = [
      row({ index: 0 }),
      row({ index: 1, categoryId: null }),
      row({ index: 2, categoryId: null }),
    ]
    const resolved = resolveRows(
      rows,
      { 0: { categoryId: 9 }, 2: { categoryId: null } },
      7
    )

    expect(resolved.map((entry) => entry.categoryId)).toEqual([9, 7, null])
  })

  it('applies selection edits and the installment link', () => {
    const rows = [row({ index: 0, installment: { number: 3, count: 10 } })]

    expect(resolveRows(rows, {}, null)[0]).toMatchObject({
      selected: true,
      linked: true,
    })
    expect(
      resolveRows(rows, { 0: { selected: false, linked: false } }, null)[0]
    ).toMatchObject({ selected: false, linked: false })
    expect(resolveRows([row()], { 0: { linked: true } }, null)[0].linked).toBe(
      false
    )
  })
})

describe('toCommitRows', () => {
  it('commits only the ticked rows, with status and installment', () => {
    const rows = [
      row({ index: 0, externalId: 'a' }),
      row({ index: 1, pending: true, installment: { number: 3, count: 10 } }),
      row({ index: 2, billPayment: true }),
    ]
    const resolved = resolveRows(rows, {}, null)

    expect(missingCategoryCount(resolved)).toBe(0)
    expect(toCommitRows(resolved)).toEqual([
      {
        name: 'Mercado',
        amount: '10.00',
        type: 'Expense',
        transactionDt: '2026-01-05',
        categoryId: 3,
        receiverId: null,
        externalId: 'a',
        status: 'Checked',
        installment: null,
      },
      expect.objectContaining({
        status: 'Verify',
        installment: { number: 3, count: 10 },
      }),
    ])
  })

  it('counts ticked rows with no category', () => {
    const resolved = resolveRows([row({ categoryId: null })], {}, null)

    expect(missingCategoryCount(resolved)).toBe(1)
    expect(toCommitRows(resolved)).toEqual([])
  })
})
