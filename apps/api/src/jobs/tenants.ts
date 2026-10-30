import { eq, inArray, isNotNull } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { recurringTransactions, tenantSettings, tenants } from '@workspace/db'

export async function listAllTenants(db: Database): Promise<number[]> {
  const rows = await db
    .select({ tenantId: tenantSettings.tenantId })
    .from(tenantSettings)

  return rows.map((row) => row.tenantId)
}

export async function listTenantsWithActiveRules(
  db: Database
): Promise<number[]> {
  const rows = await db
    .selectDistinct({ tenantId: recurringTransactions.tenantId })
    .from(recurringTransactions)
    .where(eq(recurringTransactions.status, 'ACTIVE'))

  return rows.map((row) => row.tenantId)
}

export async function listTenantsScheduledForDeletion(
  db: Database
): Promise<Array<{ tenantId: number; deletionDate: string }>> {
  const rows = await db
    .select({ tenantId: tenants.id, deletionDate: tenants.deletionDate })
    .from(tenants)
    .where(isNotNull(tenants.deletionDate))

  return rows as Array<{ tenantId: number; deletionDate: string }>
}

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
