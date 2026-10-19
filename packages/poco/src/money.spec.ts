import { describe, expect, it } from 'vitest'

import {
  addMoney,
  compareMoney,
  formatCents,
  isZeroMoney,
  negateMoney,
  toCents,
} from './money.js'

describe('addMoney', () => {
  it('adds on cents, never through a float', () => {
    expect(addMoney('0.10', '0.20')).toBe('0.30')
    expect(addMoney('0.1', '0.2')).toBe('0.30')
    expect(addMoney('12.34', '56.78')).toBe('69.12')
  })

  it('carries across the whole', () => {
    expect(addMoney('99.99', '0.02')).toBe('100.01')
  })

  it('adds negatives and answers a negative balance', () => {
    expect(addMoney('-50.00', '-30.00')).toBe('-80.00')
    expect(addMoney('30.00', '-50.00')).toBe('-20.00')
  })

  it('handles whole amounts without a fraction', () => {
    expect(addMoney('100', '200')).toBe('300.00')
  })
})

describe('negateMoney', () => {
  it('negates an amount', () => {
    expect(negateMoney('12.34')).toBe('-12.34')
    expect(negateMoney('-12.34')).toBe('12.34')
    expect(negateMoney('0.00')).toBe('0.00')
  })
})

describe('isZeroMoney', () => {
  it('tells a zero amount from any other', () => {
    expect(isZeroMoney('0.00')).toBe(true)
    expect(isZeroMoney('-0.00')).toBe(true)
    expect(isZeroMoney('0.01')).toBe(false)
  })
})

describe('compareMoney', () => {
  it('orders by cents, signs included', () => {
    expect(compareMoney('10.00', '9.99')).toBe(1)
    expect(compareMoney('-10.00', '0')).toBe(-1)
    expect(compareMoney('5', '5.00')).toBe(0)
  })
})

describe('toCents and formatCents', () => {
  it('round-trip a money string', () => {
    expect(toCents('-12.3')).toBe(-1230n)
    expect(formatCents(5n)).toBe('0.05')
    expect(formatCents(toCents('-0.07'))).toBe('-0.07')
  })
})
