import { describe, expect, it } from 'vitest'

import { totalSpending, type SpendingRow } from './household-spending.js'

const row = (overrides: Partial<SpendingRow>): SpendingRow => ({
  payerUserId: 1,
  currency: 'BRL',
  amount: '100.00',
  categoryId: 1,
  categoryName: 'Rent',
  categoryColor: '#111111',
  shares: [],
  ...overrides,
})

describe('totalSpending', () => {
  it('charges a member their share and an unsplit expense its payer', () => {
    const { byMember, byCategory } = totalSpending([
      row({
        shares: [
          { userId: 1, share: '60.00' },
          { userId: 2, share: '40.00' },
        ],
      }),
      row({ amount: '30.00', categoryId: 2, categoryName: 'Food' }),
    ])

    expect(byMember).toEqual([
      { userId: 1, currency: 'BRL', total: '90.00' },
      { userId: 2, currency: 'BRL', total: '40.00' },
    ])
    expect(byCategory.map((item) => [item.categoryName, item.total])).toEqual([
      ['Rent', '100.00'],
      ['Food', '30.00'],
    ])
  })

  it('keeps currencies apart', () => {
    const { byMember } = totalSpending([
      row({}),
      row({ currency: 'USD', amount: '5.00' }),
    ])

    expect(byMember).toHaveLength(2)
  })
})
