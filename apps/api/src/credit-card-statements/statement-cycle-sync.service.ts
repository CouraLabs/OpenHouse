import type { CardCycle } from '@workspace/poco'

import { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import type { LedgerBatchPlan } from '../common/ledger/ledger-batch.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'

export class StatementCycleSyncService extends CardCycleSync {
  constructor(private readonly statements: CreditCardStatementRepository) {
    super()
  }

  async onCycleChanged(
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle
  ): Promise<LedgerBatchPlan> {
    return this.statements.planResync(
      tenantId,
      userId,
      accountId,
      cycle,
      await this.statements.todayOf(tenantId)
    )
  }
}
