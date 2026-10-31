import { describe, expect, it } from 'vitest'

import {
  assignmentDecision,
  isCardPayment,
  type StatementAssigned,
} from './statement-assignment.js'

const stored: StatementAssigned = {
  linkedAccountId: 7,
  transactionDt: '2026-10-10',
  type: 'Expense',
  isTransferLeg: false,
  statementId: 3,
  statementPinned: false,
}

describe('assignmentDecision', () => {
  it('keeps the bill when nothing that places it changed', () => {
    expect(assignmentDecision(stored, stored)).toBe('keep')
  })

  it('re-resolves a date edit', () => {
    expect(
      assignmentDecision(stored, { ...stored, transactionDt: '2026-10-30' })
    ).toBe('resolve')
  })

  it('keeps a pinned bill through a date edit', () => {
    expect(
      assignmentDecision(
        { ...stored, statementPinned: true },
        { ...stored, transactionDt: '2026-10-30' }
      )
    ).toBe('keep')
  })

  it('re-resolves a move to another account, pinned or not', () => {
    expect(
      assignmentDecision(
        { ...stored, statementPinned: true },
        { ...stored, linkedAccountId: 8 }
      )
    ).toBe('resolve')
  })

  it('re-resolves a row that has no bill yet', () => {
    expect(assignmentDecision({ ...stored, statementId: null }, stored)).toBe(
      'resolve'
    )
  })

  it('re-resolves a change of direction', () => {
    expect(assignmentDecision(stored, { ...stored, type: 'Income' })).toBe(
      'resolve'
    )
  })
})

describe('isCardPayment', () => {
  it('is the incoming side of a transfer only', () => {
    expect(isCardPayment({ type: 'Income', isTransferLeg: true })).toBe(true)
    expect(isCardPayment({ type: 'Expense', isTransferLeg: true })).toBe(false)
    expect(isCardPayment({ type: 'Income', isTransferLeg: false })).toBe(false)
  })
})
