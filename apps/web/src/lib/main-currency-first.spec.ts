import { describe, expect, it } from 'vitest'

import { mainCurrencyFirst } from './main-currency-first.js'

describe('mainCurrencyFirst', () => {
  it('moves the main currency to the front and keeps the rest in order', () => {
    const groups = [
      { currency: 'EUR' as const },
      { currency: 'USD' as const },
      { currency: 'BRL' as const },
    ]

    expect(
      mainCurrencyFirst(groups, 'BRL').map((group) => group.currency)
    ).toEqual(['BRL', 'EUR', 'USD'])
  })

  it('leaves the groups alone when the main currency is absent', () => {
    const groups = [{ currency: 'EUR' as const }]

    expect(mainCurrencyFirst(groups, 'USD')).toEqual(groups)
  })
})
