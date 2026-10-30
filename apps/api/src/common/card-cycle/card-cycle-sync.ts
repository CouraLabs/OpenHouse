import type { CardCycle } from '@workspace/poco'

import type { LedgerBatchPlan } from '../ledger/ledger-batch.js'

export abstract class CardCycleSync {
  abstract onCycleChanged(
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle
  ): Promise<LedgerBatchPlan>
}
