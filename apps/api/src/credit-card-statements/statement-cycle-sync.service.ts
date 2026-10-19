import { Injectable } from '@nestjs/common'
import type { DbOrTx } from '@workspace/db'
import type { CardCycle } from '@workspace/poco'

import { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'
import { planCycleResync } from './cycle-resync.js'

/**
 * Applies a card's new close/due days to its Open bills, inside the
 * transaction that saves the days. Locks in the ledger's order — the moving
 * transaction rows by id, then the card, then its bills — so a resync racing
 * a purchase on the same card serializes instead of deadlocking.
 */
@Injectable()
export class StatementCycleSyncService extends CardCycleSync {
  constructor(private readonly statements: CreditCardStatementRepository) {
    super()
  }

  async onCycleChanged(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle
  ): Promise<void> {
    const today = await this.statements.todayOf(tenantId, tx)
    const candidates = await this.statements.lockResyncCandidatesInTx(
      tx,
      tenantId,
      accountId,
      today
    )

    await this.statements.lockAccountInTx(tx, tenantId, accountId)

    const { open, pinnedIds } = await this.statements.findOpenInTx(
      tx,
      tenantId,
      accountId,
      today
    )
    const plan = planCycleResync(cycle, open, candidates, pinnedIds)

    for (const update of plan.windowUpdates) {
      await this.statements.updateWindowInTx(tx, tenantId, userId, update)
    }

    const byId = new Map(candidates.map((row) => [row.id, row]))

    for (const group of plan.assignments) {
      const statementId = await this.statements.getOrCreateInTx(
        tx,
        tenantId,
        userId,
        accountId,
        group.window
      )

      await this.statements.reassignInTx(
        tx,
        tenantId,
        userId,
        group.transactionIds.flatMap((id) => byId.get(id) ?? []),
        statementId
      )
    }

    await this.statements.softDeleteInTx(tx, tenantId, userId, plan.orphanIds)
  }
}
