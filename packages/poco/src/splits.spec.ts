import { describe, expect, it } from 'vitest'

import {
  allocateByWeights,
  divideGroupShares,
  householdShares,
  inheritShares,
  resolveSplit,
  sharesMatchAmount,
  splitInputSchema,
  sumShares,
  type SplitInput,
} from './splits.js'
import { splitInstallments } from './money.js'

const equal = (...ids: number[]): SplitInput => ({
  mode: 'equal',
  entries: ids.map((userId) => ({ userId })),
})

function shares(amount: string, input: SplitInput, payer: number | null = 1) {
  const resolved = resolveSplit(amount, input, payer)

  if (!resolved.ok) {
    throw new Error(resolved.message)
  }

  return resolved.shares
}

describe('equal split', () => {
  it('divides evenly when the cents allow it', () => {
    expect(shares('100.00', equal(1, 2))).toEqual([
      { userId: 1, share: '50.00' },
      { userId: 2, share: '50.00' },
    ])
  })

  it('hands the remainder cents to the payer', () => {
    expect(shares('100.00', equal(1, 2, 3), 2)).toEqual([
      { userId: 1, share: '33.33' },
      { userId: 2, share: '33.34' },
      { userId: 3, share: '33.33' },
    ])
  })

  it('gives a multi-cent remainder to the payer as well', () => {
    // 1.00 / 3 → 33 cents each, 1 left; 0.05 / 4 → 1 cent each, 1 left.
    expect(sumShares(shares('0.05', equal(1, 2, 3, 4), 4))).toBe('0.05')
    expect(shares('0.05', equal(1, 2, 3, 4), 4)[3].share).toBe('0.02')
  })

  it('gives the remainder to the first member when the payer is not in it', () => {
    expect(shares('10.00', equal(5, 6, 7), 99)).toEqual([
      { userId: 5, share: '3.34' },
      { userId: 6, share: '3.33' },
      { userId: 7, share: '3.33' },
    ])
  })

  it('drops a member whose share rounds to nothing', () => {
    expect(shares('0.01', equal(1, 2, 3), 2)).toEqual([
      { userId: 2, share: '0.01' },
    ])
  })
})

describe('percentage split', () => {
  const percent = (...values: Array<[number, string]>): SplitInput => ({
    mode: 'percentage',
    entries: values.map(([userId, value]) => ({ userId, value })),
  })

  it('applies the percentages to the cents', () => {
    expect(shares('2000.00', percent([1, '60'], [2, '40']))).toEqual([
      { userId: 1, share: '1200.00' },
      { userId: 2, share: '800.00' },
    ])
  })

  it('handles the remainder like an equal split', () => {
    const result = shares(
      '100.00',
      percent([1, '33.33'], [2, '33.33'], [3, '33.34']),
      3
    )

    expect(sumShares(result)).toBe('100.00')
    expect(result.map((entry) => entry.share)).toEqual([
      '33.33',
      '33.33',
      '33.34',
    ])
  })

  it('rejects percentages that do not total 100', () => {
    const resolved = resolveSplit('10.00', percent([1, '50'], [2, '40']), 1)

    expect(resolved).toEqual({
      ok: false,
      message: 'The percentages must add up to 100.',
    })
  })

  it('always sums to the amount over awkward amounts', () => {
    for (const amount of ['0.07', '19.99', '1234.56', '99999999999999.99']) {
      const result = shares(
        amount,
        percent([1, '12.5'], [2, '37.5'], [3, '50']),
        2
      )

      expect(sharesMatchAmount(result, amount)).toBe(true)
    }
  })
})

describe('exact split', () => {
  const exact = (...values: Array<[number, string]>): SplitInput => ({
    mode: 'exact',
    entries: values.map(([userId, value]) => ({ userId, value })),
  })

  it('keeps the amounts typed when they add up', () => {
    expect(shares('50.00', exact([1, '30.10'], [2, '19.90']))).toEqual([
      { userId: 1, share: '30.10' },
      { userId: 2, share: '19.90' },
    ])
  })

  it('rejects amounts that do not add up', () => {
    expect(resolveSplit('50.00', exact([1, '30'], [2, '19.99']), 1)).toEqual({
      ok: false,
      message: 'The amounts must add up to the total.',
    })
  })

  it('drops a zero entry', () => {
    expect(shares('5.00', exact([1, '5.00'], [2, '0']))).toEqual([
      { userId: 1, share: '5.00' },
    ])
  })
})

describe('splitInputSchema', () => {
  it('requires a value outside the equal mode and no repeated member', () => {
    expect(
      splitInputSchema.safeParse({
        mode: 'percentage',
        entries: [{ userId: 1 }],
      }).success
    ).toBe(false)
    expect(
      splitInputSchema.safeParse({
        mode: 'equal',
        entries: [{ userId: 1 }, { userId: 1 }],
      }).success
    ).toBe(false)
    expect(splitInputSchema.safeParse(equal(1, 2)).success).toBe(true)
  })

  it('rejects an empty split and a non-positive amount', () => {
    expect(
      splitInputSchema.safeParse({ mode: 'equal', entries: [] }).success
    ).toBe(false)
    expect(resolveSplit('0.00', equal(1), 1).ok).toBe(false)
  })
})

describe('allocateByWeights', () => {
  it('refuses an empty weight list', () => {
    expect(() => allocateByWeights(100n, [], 1)).toThrow()
  })
})

describe('installments inherit the split', () => {
  it('splits every installment in the same proportions, sums exact', () => {
    const group = shares('1000.00', equal(1, 2, 3), 1)
    const parts = splitInstallments('1000.00', 3, 'total')

    for (const part of parts) {
      const inherited = inheritShares(group, part, 1)

      expect(sharesMatchAmount(inherited, part)).toBe(true)
    }
  })

  it('keeps a 60/40 split through uneven installments', () => {
    const group = shares(
      '100.00',
      {
        mode: 'percentage',
        entries: [
          { userId: 1, value: '60' },
          { userId: 2, value: '40' },
        ],
      },
      1
    )

    const parts = splitInstallments('100.00', 3, 'total')
    const inherited = parts.map((part) => inheritShares(group, part, 1))

    // Installment 1 carries the remainder cents (33.34), 60/40 of it with
    // the leftover cent to the payer.
    expect(inherited[0]).toEqual([
      { userId: 1, share: '20.01' },
      { userId: 2, share: '13.33' },
    ])
    for (const [index, part] of parts.entries()) {
      expect(sharesMatchAmount(inherited[index], part)).toBe(true)
    }
  })

  it('answers nothing for an unsplit purchase', () => {
    expect(inheritShares([], '10.00', 1)).toEqual([])
  })
})

describe('divideGroupShares', () => {
  it('leaves no cent drift: each member’s installments add up to their group share', () => {
    const group = shares('100.00', equal(1, 2, 3), 1)
    const parts = splitInstallments('100.00', 3, 'total')
    const divided = divideGroupShares(group, parts, 1)

    for (const [index, part] of parts.entries()) {
      expect(sharesMatchAmount(divided[index], part)).toBe(true)
    }
    for (const entry of group) {
      const owed = divided
        .flat()
        .filter((share) => share.userId === entry.userId)
      expect(sumShares(owed)).toBe(entry.share)
    }
  })

  it('keeps a 60/40 split exact through uneven installments', () => {
    const group = shares(
      '100.00',
      {
        mode: 'percentage',
        entries: [
          { userId: 1, value: '60' },
          { userId: 2, value: '40' },
        ],
      },
      2
    )
    const parts = splitInstallments('100.00', 3, 'total')
    const divided = divideGroupShares(group, parts, 2)

    expect(sumShares(divided.flat().filter((s) => s.userId === 1))).toBe(
      '60.00'
    )
    expect(sumShares(divided.flat().filter((s) => s.userId === 2))).toBe(
      '40.00'
    )
    for (const [index, part] of parts.entries()) {
      expect(sharesMatchAmount(divided[index], part)).toBe(true)
    }
  })

  it('never gives a fully paid member a cent, payer included', () => {
    const group = shares('10.00', equal(1, 2), 2)
    const divided = divideGroupShares(group, ['3.34', '3.33', '3.33'], 2)

    for (const installment of divided) {
      for (const share of installment) {
        expect(Number(share.share)).toBeGreaterThan(0)
      }
    }
  })

  it('answers nothing for an unsplit purchase', () => {
    expect(divideGroupShares([], ['10.00', '5.00'], 1)).toEqual([[], []])
  })
})

describe('householdShares', () => {
  it('shares an unsplit expense equally between the members', () => {
    expect(householdShares('90.01', [1, 2, 3], 3)).toEqual([
      { userId: 1, share: '30.00' },
      { userId: 2, share: '30.00' },
      { userId: 3, share: '30.01' },
    ])
    expect(householdShares('10.00', [], 1)).toEqual([])
  })
})
