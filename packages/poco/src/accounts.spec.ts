import { describe, expect, it } from 'vitest'

import { createAccountSchema, spreadPctSchema } from './accounts.js'

describe('spreadPctSchema', () => {
  it('accepts 0 to 100 with up to two decimals', () => {
    for (const value of ['0', '4', '4.5', '4.00', '20.25', '100', '100.00']) {
      expect(spreadPctSchema.safeParse(value).success).toBe(true)
    }
  })

  it('rejects a negative, too precise, out of range, or non-decimal spread', () => {
    for (const value of ['-1', '4.567', '100.01', '1000', 'abc', '', '4,5']) {
      expect(spreadPctSchema.safeParse(value).success).toBe(false)
    }
  })

  it('defaults an account without a spread to 0', () => {
    const parsed = createAccountSchema.parse({
      name: 'Cash',
      type: 'Wallet',
      balance: '0.00',
      currency: 'USD',
    })

    expect(parsed.spreadPct).toBe('0')
  })

  it('lets a credit card omit the opening balance but requires it elsewhere', () => {
    const card = {
      name: 'Card',
      type: 'Credit Card',
      currency: 'USD',
      limit: '1000.00',
      closeDay: 5,
      dueDay: 15,
    }
    const wallet = { name: 'Cash', type: 'Wallet', currency: 'USD' }

    expect(createAccountSchema.safeParse(card).success).toBe(true)
    expect(createAccountSchema.safeParse(wallet).success).toBe(false)
  })

  it('rejects a card whose close and due days match on the due day', () => {
    const result = createAccountSchema.safeParse({
      name: 'Card',
      type: 'Credit Card',
      currency: 'USD',
      limit: '1000.00',
      closeDay: 10,
      dueDay: 10,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'dueDay',
    ])
  })
})
