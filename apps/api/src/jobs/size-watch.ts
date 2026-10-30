import { sql } from 'drizzle-orm'
import type { Database } from '@workspace/db'

const TABLES = [
  'tenants',
  'users',
  'tenant_codes',
  'password_reset_codes',
  'tenant_settings',
  'categories',
  'limits',
  'accounts',
  'credit_card_statements',
  'goals',
  'receivers',
  'transaction_linkers',
  'recurring_transactions',
  'transactions',
  'transaction_splits',
  'transaction_history',
  'import_mappings',
  'audit_log',
  'notification_preferences',
  'push_subscriptions',
  'notifications',
  'notification_log',
  'calendar_feeds',
] as const

export async function logDatabaseSize(
  db: Database,
  tenantId?: number
): Promise<Record<string, number>> {
  const totals: Record<string, number> = {}
  let grand = 0

  for (const table of TABLES) {
    const scoped = await db
      .select({ value: sql<number>`count(*)` })
      .from(sql.raw(`"${table}"`))
      .where(tenantId === undefined ? undefined : sql`tenant_id = ${tenantId}`)
    const count = Number(scoped[0]?.value ?? 0)

    totals[table] = count
    grand += count
  }

  totals._total = grand

  console.log(
    `[size-watch] rows total=${grand}` +
      (tenantId === undefined ? '' : ` tenant=${tenantId}`) +
      ' ' +
      Object.entries(totals)
        .filter(([table]) => table !== '_total' && count0(totals, table) > 0)
        .map(([table, count]) => `${table}=${count}`)
        .join(' ')
  )

  return totals
}

function count0(totals: Record<string, number>, table: string): number {
  return totals[table] ?? 0
}

