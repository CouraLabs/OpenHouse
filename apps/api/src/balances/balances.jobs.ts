import type { Database } from '@workspace/db'

import { BalanceRepository } from './balance.repository.js'

/**
 * The nightly balance-drift check for one tenant — the queue job the cron
 * fans out to (`scheduled.ts` enqueues one `balances` message per tenant).
 * It asserts `balance == openingBalance + sum(deltas)` for every ACTIVE
 * account and logs each one that drifted. Read-only and idempotent: a
 * redelivered message logs the same drift twice and changes nothing.
 */
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
