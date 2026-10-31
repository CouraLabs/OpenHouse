import type {
  CreditCardStatementRepository,
  StatementTarget,
} from '@workspace/db'

import { cardCycleOf, resolveStatement } from '../calc/credit-card-cycle.js'
import type { TenantToday } from '../settings/tenant-today.js'
import {
  assignmentDecision,
  isCardPayment,
  type StatementAssigned,
  type StatementKey,
} from './statement-assignment.js'

export class StatementPlacer {
  constructor(
    private readonly statements: Pick<CreditCardStatementRepository, 'findCard'>,
    private readonly today: Pick<TenantToday, 'of'>
  ) {}

  async place(
    tenantId: number,
    key: StatementKey,
    options: { offset?: number; pinned?: boolean } = {}
  ): Promise<StatementTarget> {
    if (isCardPayment(key)) {
      return { kind: 'none' }
    }

    const card = await this.statements.findCard(tenantId, key.linkedAccountId)
    const cycle =
      card === undefined || card.type !== 'Credit Card'
        ? null
        : cardCycleOf(card)

    if (cycle === null) {
      return { kind: 'none' }
    }

    const window = resolveStatement(cycle, key.transactionDt, options.offset)

    return {
      kind: 'bill',
      accountId: key.linkedAccountId,
      window,
      closed: window.closeDate <= (await this.today.of(tenantId)),
      pinned: options.pinned ?? false,
    }
  }

  async replace(
    tenantId: number,
    before: StatementAssigned,
    after: StatementKey
  ): Promise<StatementTarget> {
    if (assignmentDecision(before, after) === 'keep') {
      return {
        kind: 'keep',
        statementId: before.statementId,
        statementPinned: before.statementPinned,
      }
    }

    return this.place(tenantId, after)
  }
}

export function isClosedTarget(target: StatementTarget): boolean {
  return target.kind === 'bill' && target.closed
}

export function assignedOf(row: {
  linkedAccountId: number
  transactionDt: string
  type: StatementKey['type']
  transferGroupId: string | null
  statementId: number | null
  statementPinned: boolean
}): StatementAssigned {
  return {
    linkedAccountId: row.linkedAccountId,
    transactionDt: row.transactionDt,
    type: row.type,
    isTransferLeg: row.transferGroupId !== null,
    statementId: row.statementId,
    statementPinned: row.statementPinned,
  }
}
