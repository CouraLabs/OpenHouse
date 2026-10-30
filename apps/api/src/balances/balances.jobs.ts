import type { Database } from '@workspace/db'

import { BalanceRepository } from './balance.repository.js'

export async function checkBalancesForTenant(
  db: Database,
  tenantId: number
): Promise<number> {
  const { drifts } = await new BalanceRepository(db).findDrifts(tenantId)

  for (const drift of drifts) {
    console.error(
      `Balance drift on account ${drift.accountId} (tenant ${drift.tenantId}): cached ${drift.balance}, ledger ${drift.expected}, off by ${drift.drift}.`
    )
  }

  return drifts.length
}
