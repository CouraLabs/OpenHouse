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
})
