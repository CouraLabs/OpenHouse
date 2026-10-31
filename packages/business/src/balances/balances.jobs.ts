import { BalanceRepository, type Database } from '@workspace/db'

import { findBalanceDrifts } from './balance-ledger.js'

export async function checkBalancesForTenant(
  db: Database,
  tenantId: number
): Promise<number> {
  const { accounts, totals } = await new BalanceRepository(
    db
  ).listAccountTotals(tenantId)
  const { drifts } = findBalanceDrifts(accounts, totals)

  for (const drift of drifts) {
    console.error(
      `Balance drift on account ${drift.accountId} (tenant ${drift.tenantId}): cached ${drift.balance}, ledger ${drift.expected}, off by ${drift.drift}.`
    )
  }

  return drifts.length
}
