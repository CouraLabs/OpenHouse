import { describe, expect, it } from 'vitest'
import type { CategoryRef } from '@workspace/dto'
import { inferCategory } from './infer-category.js'

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
    expect(inferCategory('a e de', categories)).toBeUndefined()
  })

  it('does not pick a category from a single shared short word', () => {
    expect(
      inferCategory('QA Incomplete', [category('QA Groceries')])
    ).toBeUndefined()
  })
})
