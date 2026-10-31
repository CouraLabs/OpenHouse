import { describe, expect, it } from 'vitest'
import type { StatementStatus } from '@workspace/domain'
import {
  defaultPaymentStatement,
  deriveStatementStatus,
  isPrepaid,
} from './credit-card-statements.js'

const bill = {
  closeDate: '2026-10-25',
  dueDate: '2026-11-05',
  owed: '500.00',
  paid: '0.00',
}

describe('deriveStatementStatus', () => {
  it('is Open while the period runs, even when prepaid', () => {
    expect(deriveStatementStatus({ ...bill, today: '2026-10-24' })).toBe('Open')
    expect(
      deriveStatementStatus({ ...bill, today: '2026-10-24', paid: '500.00' })
    ).toBe('Open')
  })

  it('is Paid once the payments cover what is owed', () => {
    expect(
      deriveStatementStatus({ ...bill, today: '2026-11-20', paid: '500.00' })
    ).toBe('Paid')
    expect(
      deriveStatementStatus({ ...bill, today: '2026-10-30', paid: '600.00' })
    ).toBe('Paid')
  })

  it('is Paid when nothing is owed', () => {
    expect(
      deriveStatementStatus({ ...bill, today: '2026-11-20', owed: '0.00' })
    ).toBe('Paid')
    expect(
      deriveStatementStatus({ ...bill, today: '2026-11-20', owed: '-30.00' })
    ).toBe('Paid')
  })

  it('is Overdue past the due date, paid in part or not at all', () => {
    expect(deriveStatementStatus({ ...bill, today: '2026-11-06' })).toBe(
      'Overdue'
    )
    expect(
      deriveStatementStatus({ ...bill, today: '2026-11-06', paid: '100.00' })
    ).toBe('Overdue')
  })

  it('is PartiallyPaid between close and due with some payment', () => {
    expect(
      deriveStatementStatus({ ...bill, today: '2026-11-05', paid: '100.00' })
    ).toBe('PartiallyPaid')
  })

  it('is Closed from the close date until due, nothing paid', () => {
    expect(deriveStatementStatus({ ...bill, today: '2026-10-25' })).toBe(
      'Closed'
    )
    expect(deriveStatementStatus({ ...bill, today: '2026-11-05' })).toBe(
      'Closed'
    )
  })
})

describe('defaultPaymentStatement', () => {
  const bill = (closeDate: string, status: StatementStatus) => ({
    closeDate,
    status,
  })

  it('picks the oldest closed bill still unpaid', () => {
    expect(
      defaultPaymentStatement([
        bill('2026-10-25', 'Open'),
        bill('2026-09-25', 'Overdue'),
        bill('2026-08-25', 'Paid'),
        bill('2026-07-25', 'PartiallyPaid'),
      ])
    ).toEqual(bill('2026-07-25', 'PartiallyPaid'))
  })

  it('falls back to the earliest Open bill', () => {
    expect(
      defaultPaymentStatement([
        bill('2026-11-25', 'Open'),
        bill('2026-10-25', 'Open'),
        bill('2026-09-25', 'Paid'),
      ])
    ).toEqual(bill('2026-10-25', 'Open'))
  })

  it('answers nothing for a card with no bill to pay', () => {
    expect(defaultPaymentStatement([bill('2026-09-25', 'Paid')])).toBe(
      undefined
    )
  })
})

describe('isPrepaid', () => {
  it('reads an Open bill with a payment as prepaid', () => {
    expect(isPrepaid({ status: 'Open', paid: '10.00' })).toBe(true)
    expect(isPrepaid({ status: 'Open', paid: '0.00' })).toBe(false)
    expect(isPrepaid({ status: 'Paid', paid: '10.00' })).toBe(false)
  })
})
