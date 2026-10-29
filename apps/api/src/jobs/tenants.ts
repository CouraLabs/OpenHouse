import { eq, inArray, isNotNull } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { recurringTransactions, tenantSettings, tenants } from '@workspace/db'

/**
 * The tenant lists each cron schedule fans out over. The crons read across
 * tenants — the one sanctioned crossing of the tenant boundary — and only
 * ever list ids, so the reads stay confined to these three queries.
 */

/** Every tenant that has settings — a tenant created without them has
 * nothing to evaluate. */
export async function listAllTenants(db: Database): Promise<number[]> {
  const rows = await db
    .select({ tenantId: tenantSettings.tenantId })
    .from(tenantSettings)

  return rows.map((row) => row.tenantId)
}

/** Every tenant with an ACTIVE recurring rule — what the recurring run
 * materializes, on each tenant's own calendar day. */
export async function listTenantsWithActiveRules(
  db: Database
): Promise<number[]> {
  const rows = await db
    .selectDistinct({ tenantId: recurringTransactions.tenantId })
    .from(recurringTransactions)
    .where(eq(recurringTransactions.status, 'ACTIVE'))

  return rows.map((row) => row.tenantId)
}

/** Every tenant whose scheduled deletion day has come — the day, in the
 * tenant's zone, the hourly job checks. */
export async function listTenantsScheduledForDeletion(
  db: Database
): Promise<Array<{ tenantId: number; deletionDate: string }>> {
  const rows = await db
    .select({ tenantId: tenants.id, deletionDate: tenants.deletionDate })
    .from(tenants)
    .where(isNotNull(tenants.deletionDate))

  return rows as Array<{ tenantId: number; deletionDate: string }>
}

/** The time zones of several tenants, keyed by tenant id — what decides
 * each tenant's "today" (rule 6c). */
export async function timezonesOf(
  db: Database,
  tenantIds: readonly number[]
): Promise<Map<number, string>> {
  if (tenantIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      tenantId: tenantSettings.tenantId,
      timezone: tenantSettings.timezone,
    })
    .from(tenantSettings)
    .where(inArray(tenantSettings.tenantId, [...tenantIds]))

  return new Map(rows.map((row) => [row.tenantId, row.timezone]))
}
