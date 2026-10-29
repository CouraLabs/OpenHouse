import { Injectable } from '@nestjs/common'
import type { CardCycle } from '@workspace/poco'

import { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import type { LedgerBatchPlan } from '../common/ledger/ledger-batch.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'

/**
 * Applies a card's new close/due days to its Open bills. The plan it
 * answers rides the same batch that saves the days: the moved rows are
 * re-placed under their own optimistic guards, and the bills nothing stays
 * on are soft-deleted guarded by a re-check — a purchase racing the resync
 * keeps its bill, and the racing writes answer 409 instead of tangling.
 */
@Injectable()
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
