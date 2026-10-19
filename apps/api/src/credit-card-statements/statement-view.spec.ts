import { describe, expect, it } from 'vitest'

import { toStatement, type StatementTotalsRow } from './statement-view.js'

const row = (
  overrides: Partial<StatementTotalsRow> = {}
): StatementTotalsRow => ({
  id: 4,
  accountId: 9,
  accountName: 'Visa',
  currency: 'BRL',
  closeDayInclusive: false,
  periodStart: '2026-09-25',
  closeDate: '2026-10-25',
  dueDate: '2026-11-05',
  closedAt: null,
  minimumDue: null,
  bankTotal: null,
  reconciledAt: null,
  transactionCount: 3,
  paymentCount: 0,
  charges: '300.00',
  credits: '20.00',
  total: '280.00',
  paid: '0.00',
  previousBalance: '50.00',
  nextDueDate: '2026-12-05',
  ...overrides,
})

describe('toStatement', () => {
  it('owes the carry-over plus the bill, less what was paid', () => {
    const bill = toStatement(row({ paid: '100.00' }), '2026-10-30')

    expect(bill.amountDue).toBe('230.00')
    expect(bill.status).toBe('PartiallyPaid')
  })

  it('derives the status against the given today', () => {
    expect(toStatement(row(), '2026-10-24').status).toBe('Open')
    expect(toStatement(row(), '2026-10-25').status).toBe('Closed')
    expect(toStatement(row(), '2026-11-06').status).toBe('Overdue')
  })

  it('reads an overpaid carry-over as a credit', () => {
    const bill = toStatement(row({ previousBalance: '-300.00' }), '2026-11-06')

    expect(bill.amountDue).toBe('-20.00')
    expect(bill.status).toBe('Paid')
  })

  it('shows the bank close day of an inclusive card', () => {
    expect(
      toStatement(
        row({ closeDayInclusive: true, closeDate: '2026-10-26' }),
        '2026-10-01'
      ).closesOn
    ).toBe('2026-10-25')
  })

  it('names the next bill a closed remainder was carried to', () => {
    const bill = toStatement(row({ paid: '100.00' }), '2026-11-06')

    expect(bill.status).toBe('Overdue')
    expect(bill.carriedTo).toBe('2026-12-05')
  })

  it('names the next bill an overpayment credit was carried to', () => {
    const bill = toStatement(row({ paid: '380.00' }), '2026-11-06')

    expect(bill.amountDue).toBe('-50.00')
    expect(bill.status).toBe('Paid')
    expect(bill.carriedTo).toBe('2026-12-05')
  })

  it('carries nothing from a bill paid exactly, or one still open', () => {
    expect(
      toStatement(row({ paid: '330.00' }), '2026-11-06').carriedTo
    ).toBeNull()
    expect(toStatement(row(), '2026-10-24').carriedTo).toBeNull()
  })

  it('carries nothing from the card latest bill', () => {
    expect(
      toStatement(row({ nextDueDate: null }), '2026-11-06').carriedTo
    ).toBeNull()
  })
})
