import { describe, expect, it } from 'vitest'
import { formatCents, toCents } from '@workspace/domain'
import {
  addMoney,
  compareMoney,
  isZeroMoney,
  negateMoney,
  splitInstallments,
  sumMoney,
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

describe('splitInstallments', () => {
  it('puts the remainder cents on installment 1', () => {
    expect(splitInstallments('1000.00', 3, 'total')).toEqual([
      '333.34',
      '333.33',
      '333.33',
    ])
  })

  it('always reconstructs the total exactly, for every count 2–48', () => {
    for (const total of ['0.01', '1.00', '99.99', '1000.00', '12345.67']) {
      for (let count = 2; count <= 48; count++) {
        const parts = splitInstallments(total, count, 'total')

        expect(parts).toHaveLength(count)
        expect(sumMoney(parts)).toBe(formatCents(toCents(total)))
        expect(
          parts.every(
            (part) => toCents(parts[0]) - toCents(part) < BigInt(count)
          )
        ).toBe(true)
      }
    }
  })

  it('repeats a per-installment amount', () => {
    expect(splitInstallments('110.00', 3, 'perInstallment')).toEqual([
      '110.00',
      '110.00',
      '110.00',
    ])
  })

  it('keeps a single installment whole', () => {
    expect(splitInstallments('10.05', 1, 'total')).toEqual(['10.05'])
  })
})
