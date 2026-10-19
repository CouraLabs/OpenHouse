import type { DbOrTx } from '@workspace/db'
import type { CardCycle } from '@workspace/poco'

/**
 * Keeps a card's bills in step when its close or due days change. Abstract
 * so the accounts feature, which owns the card's days, never depends on the
 * feature that owns the bills: accounts calls this port inside the
 * transaction that saves the days, and credit-card-statements provides the
 * implementation.
 */
export abstract class CardCycleSync {
  /**
   * Re-resolves the card's Open bills and the unpinned charges on them —
   * and assigns the charges that have no bill yet — under the new cycle.
   * Runs before the account row is written, inside the caller's
   * transaction; closed bills keep their snapshotted days.
   */
  abstract onCycleChanged(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle
  ): Promise<void>
}
