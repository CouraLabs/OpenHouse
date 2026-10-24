import { describe, expect, it } from 'vitest'

import type { CategoryRef } from './categories.js'
import { inferCategory } from './infer-category.js'

/** A category the matcher can score against, from a name alone. */
const category = (name: string): CategoryRef => ({
  id: name.length,
  name,
})

describe('inferCategory', () => {
  const categories = [
    category('Groceries'),
    category('Transport'),
    category('Health / Pharmacy'),
    category('Eating Out'),
  ]

  it('matches an exact name, ignoring case and accents', () => {
    expect(inferCategory('groceries', categories)?.name).toBe('Groceries')
    expect(inferCategory('FARMÁCIA', [category('Farmácia')])?.name).toBe(
      'Farmácia'
    )
  })

  it('matches a description that carries the category name', () => {
    expect(
      inferCategory('Uber *Trip* to airport', [
        category('Uber'),
        category('Transport'),
      ])?.name
    ).toBe('Uber')
  })

  it('matches on every token the description shares', () => {
    expect(inferCategory('eating out with friends', categories)?.name).toBe(
      'Eating Out'
    )
  })

  it('matches on one shared token when nothing stronger fits', () => {
    expect(inferCategory('pharmacy delivery', categories)?.name).toBe(
      'Health / Pharmacy'
    )
  })

  it('answers the strongest match when several fit', () => {
    // Both names fit inside the description, but the exact match outranks
    // the substring one.
    expect(
      inferCategory('groceries market', [
        category('Groceries'),
        category('Groceries Market'),
      ])?.name
    ).toBe('Groceries Market')
  })

  it('answers nothing when the description shares nothing', () => {
    expect(inferCategory('whatever', categories)).toBeUndefined()
    expect(inferCategory('', categories)).toBeUndefined()
  })

  it('matches a stemmed word against the category plural', () => {
    // The reported failure: "Grocery store run" never matched "Groceries".
    expect(inferCategory('grocery store run', categories)?.name).toBe(
      'Groceries'
    )
  })

  it('stems the plural on either side of the match', () => {
    expect(inferCategory('two taxis', [category('Taxi')])?.name).toBe('Taxi')
    expect(inferCategory('taxis', [category('Taxis')])?.name).toBe('Taxis')
  })

  it('matches a shared prefix of at least four letters', () => {
    expect(inferCategory('grocer', categories)?.name).toBe('Groceries')
  })

  it('never matches through tokens shorter than four letters', () => {
    // "a", "e", and "de" only ever match themselves — the prefix rule has
    // a floor, so three-letter noise matches nothing.
    expect(inferCategory('a e de', categories)).toBeUndefined()
  })
})
