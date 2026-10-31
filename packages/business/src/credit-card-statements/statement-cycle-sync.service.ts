import type {
  CreditCardStatementRepository,
  LedgerBatchPlan,
} from '@workspace/db'
import type { CardCycle } from '@workspace/dto'

import { CardCycleSync } from '../ports/card-cycle-sync.js'
import type { TenantToday } from '../settings/tenant-today.js'
import { planCycleResync } from './cycle-resync.js'

export class StatementCycleSyncService extends CardCycleSync {
  constructor(
    private readonly statements: Pick<
      CreditCardStatementRepository,
      'resyncCandidates' | 'findOpen' | 'planResyncWrites'
    >,
    private readonly today: Pick<TenantToday, 'of'>
  ) {
    super()
  }

  async onCycleChanged(
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle
  ): Promise<LedgerBatchPlan> {
    const today = await this.today.of(tenantId)
    const candidates = await this.statements.resyncCandidates(
      tenantId,
      accountId,
      today
    )
    const { open, pinnedIds } = await this.statements.findOpen(
      tenantId,
      accountId,
      today
    )
    const plan = planCycleResync(cycle, open, candidates, pinnedIds)

    return this.statements.planResyncWrites(
      tenantId,
      userId,
      accountId,
      {
        windowUpdates: plan.windowUpdates,
        assignments: plan.assignments.map((group) => ({
          ...group,
          closed: group.window.closeDate <= today,
        })),
        orphanIds: plan.orphanIds,
      },
      open,
      candidates
    )
  }
}
