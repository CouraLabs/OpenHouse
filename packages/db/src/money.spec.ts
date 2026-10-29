import { describe, expect, it } from 'vitest'
import { centsToDecimal, decimalToCents } from './money.js'

describe('decimalToCents', () => {
  it('converts the two-decimal shape', () => {
    expect(decimalToCents('12.34')).toBe(1234)
    expect(decimalToCents('0.01')).toBe(1)
    expect(decimalToCents('0')).toBe(0)
    expect(decimalToCents('12')).toBe(1200)
    expect(decimalToCents('1000000.00')).toBe(100_000_000)
  })

  it('converts negatives exactly, including -0.01', () => {
    expect(decimalToCents('-0.01')).toBe(-1)
    expect(decimalToCents('-12.34')).toBe(-1234)
    expect(decimalToCents('-1.50')).toBe(-150)
  })

  it('rejects values the storage cannot hold exactly', () => {
    expect(() => decimalToCents('12.345')).toThrow()
    expect(() => decimalToCents('abc')).toThrow()
    expect(() => decimalToCents('')).toThrow()
    expect(() => decimalToCents('90071992547409.92')).toThrow() // > 2^53-1 cents
  })

  it('accepts the boundary value 2^53-1 cents', () => {
    expect(decimalToCents('90071992547409.91')).toBe(2 ** 53 - 1)
  })
})

describe('centsToDecimal', () => {
  it('formats the two-decimal wire shape', () => {
    expect(centsToDecimal(1234)).toBe('12.34')
    expect(centsToDecimal(0)).toBe('0.00')
    expect(centsToDecimal(1)).toBe('0.01')
    expect(centsToDecimal(-1)).toBe('-0.01')
    expect(centsToDecimal(-1234)).toBe('-12.34')
    expect(centsToDecimal(2 ** 53 - 1)).toBe('90071992547409.91')
  })

  it('rejects fractional cents', () => {
    expect(() => centsToDecimal(1.5)).toThrow()
  })
})

describe('money conversions compose', () => {
  it('round-trips every shape the wire carries, canonically', () => {
    for (const [value, canonical] of [
      ['12.34', '12.34'],
      ['-0.01', '-0.01'],
      ['0', '0.00'],
      ['90071992547409.91', '90071992547409.91'],
    ] as const) {
      expect(centsToDecimal(decimalToCents(value))).toBe(canonical)
    }
  })
})
