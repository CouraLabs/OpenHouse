import type { CardCycle } from '@workspace/poco'

import type { LedgerBatchPlan } from '../ledger/ledger-batch.js'

/**
 * Keeps a card's bills in step when its close or due days change. Abstract
 * so the accounts feature, which owns the card's days, never depends on the
 * feature that owns the bills: accounts asks this port for the resync's
 * statements and writes them into the same batch that saves the days —
 * bills and days commit together or not at all. Closed bills keep their
 * snapshotted days.
 */
export abstract class CardCycleSync {
  /**
   * Plans the resync: re-resolves the card's Open bills and the unpinned
   * charges on them, and assigns the charges that have no bill yet, under
   * the new cycle. The caller runs the plan inside the batch that saves
   * the account.
   */
  abstract onCycleChanged(
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle
  ): Promise<LedgerBatchPlan>
}
