import { describe, expect, it } from 'vitest'

import {
  type InstallmentState,
  isOpenInstallment,
  planGroupEdit,
} from './installment-plan.js'

const installments: InstallmentState[] = [
  { id: 1, amount: '333.34', installmentNumber: 1, closeDate: '2026-10-25' },
  { id: 2, amount: '333.33', installmentNumber: 2, closeDate: '2026-11-25' },
  { id: 3, amount: '333.33', installmentNumber: 3, closeDate: '2026-12-25' },
]

describe('isOpenInstallment', () => {
  it('reads a bill whose close is ahead as Open', () => {
    expect(isOpenInstallment({ closeDate: '2026-10-25' }, '2026-10-24')).toBe(
      true
    )
    expect(isOpenInstallment({ closeDate: '2026-10-25' }, '2026-10-25')).toBe(
      false
    )
  })

  it('reads an installment on no bill as Open', () => {
    expect(isOpenInstallment({ closeDate: null }, '2026-10-25')).toBe(true)
  })
})

describe('planGroupEdit', () => {
  it('changes only the shared fields when the split stays', () => {
    expect(
      planGroupEdit(installments, 3, ['333.34', '333.33', '333.33'])
    ).toBe('meta')
  })

  it('updates in place when only the amounts change', () => {
    expect(planGroupEdit(installments, 3, ['400.00', '400.00', '400.00'])).toBe(
      'amounts'
    )
  })

  it('re-splits when the count changes', () => {
    expect(planGroupEdit(installments, 3, ['500.00', '500.00'])).toBe(
      'resplit'
    )
  })

  it('re-splits a purchase missing installments', () => {
    expect(
      planGroupEdit(installments.slice(0, 2), 3, ['333.34', '333.33', '333.33'])
    ).toBe('resplit')
  })
})
