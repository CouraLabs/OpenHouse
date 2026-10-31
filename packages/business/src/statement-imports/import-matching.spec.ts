import { describe, expect, it } from 'vitest'

import { chunk } from './chunk.js'
import {
  findProbableDuplicate,
  indexByAmount,
  type ExistingRow,
} from './import-duplicates.js'
import { assignInstallmentGroups } from './import-installments.js'
import { buildSuggester } from './import-suggestions.js'

describe('buildSuggester', () => {
  const suggest = buildSuggester({
    categories: [
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Transport' },
      { id: 3, name: 'Salary' },
    ],
    receivers: [
      { id: 10, name: 'Padaria do João' },
      { id: 11, name: 'Uber' },
    ],
    linkers: [
      { description: 'uber', categoryId: 2, receiverId: 11 },
      { description: 'padaria', categoryId: 1, receiverId: null },
      { description: 'ghost', categoryId: 99, receiverId: null },
    ],
  })

  it('prefers the category the file itself names', () => {
    expect(suggest({ name: 'UBER *TRIP', categoryText: 'salary' })).toEqual({
      categoryId: 3,
      receiverId: 11,
      source: 'file',
    })
  })

  it('uses a linker, with its receiver', () => {
    expect(suggest({ name: 'UBER *TRIP 1234', categoryText: null })).toEqual({
      categoryId: 2,
      receiverId: 11,
      source: 'linker',
    })
  })

  it('matches a receiver by name even without a linker receiver', () => {
    expect(
      suggest({ name: 'PADARIA   DO JOÃO 55', categoryText: null })
    ).toEqual({ categoryId: 1, receiverId: 10, source: 'linker' })
  })

  it('falls back to the fuzzy category match, or to nothing', () => {
    expect(suggest({ name: 'Weekly groceries', categoryText: null })).toEqual({
      categoryId: 1,
      receiverId: null,
      source: 'inferred',
    })
    expect(suggest({ name: 'Zzz', categoryText: null })).toEqual({
      categoryId: null,
      receiverId: null,
      source: null,
    })
  })

  it('ignores a linker pointing at a category that is gone', () => {
    expect(suggest({ name: 'ghost town', categoryText: null }).source).toBe(
      null
    )
  })
})

describe('findProbableDuplicate', () => {
  const existing: ExistingRow[] = [
    {
      id: 1,
      name: 'SUPERMERCADO EXTRA 0123',
      transactionDt: '2026-01-05',
      amount: '120.00',
      type: 'Expense',
    },
    {
      id: 2,
      name: 'Posto Ipiranga',
      transactionDt: '2026-01-05',
      amount: '120.00',
      type: 'Expense',
    },
  ]
  const index = indexByAmount(existing)
  const row = {
    name: 'Supermercado Extra',
    amount: '120.00',
    type: 'Expense' as const,
    transactionDt: '2026-01-07',
  }

  it('flags the same amount within two days with a similar description', () => {
    expect(findProbableDuplicate(row, index)?.id).toBe(1)
  })

  it('does not flag a third day, another amount, direction, or description', () => {
    expect(
      findProbableDuplicate({ ...row, transactionDt: '2026-01-08' }, index)
    ).toBeUndefined()
    expect(
      findProbableDuplicate({ ...row, amount: '120.01' }, index)
    ).toBeUndefined()
    expect(
      findProbableDuplicate({ ...row, type: 'Income' }, index)
    ).toBeUndefined()
    expect(
      findProbableDuplicate({ ...row, name: 'Farmácia Pague Menos' }, index)
    ).toBeUndefined()
  })
})

describe('assignInstallmentGroups', () => {
  let counter = 0
  const id = () => `group-${++counter}`

  it('groups rows of one merchant and count, and leaves others alone', () => {
    counter = 0
    const links = assignInstallmentGroups(
      [
        { name: 'LOJA X PARC 03/10', installment: { number: 3, count: 10 } },
        { name: 'LOJA X PARC 04/10', installment: { number: 4, count: 10 } },
        { name: 'LOJA Y 1/3', installment: { number: 1, count: 3 } },
        { name: 'MERCADO', installment: null },
        { name: 'LOJA X PARC 03/06', installment: { number: 3, count: 6 } },
      ],
      id
    )

    expect(links).toEqual([
      { groupId: 'group-1', number: 3, count: 10 },
      { groupId: 'group-1', number: 4, count: 10 },
      { groupId: 'group-2', number: 1, count: 3 },
      null,
      { groupId: 'group-3', number: 3, count: 6 },
    ])
  })

  it('starts a new group when a number repeats (two purchases)', () => {
    counter = 0
    const links = assignInstallmentGroups(
      [
        { name: 'LOJA X PARC 03/10', installment: { number: 3, count: 10 } },
        { name: 'LOJA X PARC 03/10', installment: { number: 3, count: 10 } },
      ],
      id
    )

    expect(links.map((link) => link?.groupId)).toEqual(['group-1', 'group-2'])
  })
})

describe('chunk', () => {
  it('splits into consecutive chunks of at most the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 500)).toEqual([])
    expect(
      chunk(
        Array.from({ length: 5000 }, (_, i) => i),
        500
      )
    ).toHaveLength(10)
  })
})
