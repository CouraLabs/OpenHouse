import { and, count, eq, notInArray, sql } from 'drizzle-orm'
import {
  CARD_PAYMENT_CATEGORY,
  SETTLEMENT_CATEGORY,
  type TenantUsageKind,
  type TierResource,
} from '@workspace/domain'
import type { Database } from '../../database.js'
import {
  accounts,
  categories,
  goals,
  limits,
  receivers,
  recurringTransactions,
  tenants,
  tenantSettings,
  tenantUsage,
  transactionLinkers,
  users,
} from '../../schema.js'

const SYSTEM_CATEGORY_NAMES = [
  CARD_PAYMENT_CATEGORY.name,
  SETTLEMENT_CATEGORY.name,
]

export class TierRepository {
  constructor(private readonly db: Database) {}

  async tenantTier(
    tenantId: number
  ): Promise<{ tier: number; timezone: string } | undefined> {
    const [row] = await this.db
      .select({ tier: tenants.tier, timezone: tenantSettings.timezone })
      .from(tenants)
      .leftJoin(tenantSettings, eq(tenantSettings.tenantId, tenants.id))
      .where(eq(tenants.id, tenantId))

    return row === undefined
      ? undefined
      : { tier: row.tier, timezone: row.timezone ?? 'UTC' }
  }

  async countActiveUsers(tenantId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))

    return row?.value ?? 0
  }

  async countItems(tenantId: number, resource: TierResource): Promise<number> {
    const [row] = await this.itemCount(tenantId, resource)

    return row?.value ?? 0
  }

  private itemCount(tenantId: number, resource: TierResource) {
    const select = this.db.select({ value: count() })

    switch (resource) {
      case 'accounts':
        return select
          .from(accounts)
          .where(
            and(eq(accounts.tenantId, tenantId), eq(accounts.status, 'ACTIVE'))
          )
      case 'categories':
        return select
          .from(categories)
          .where(
            and(
              eq(categories.tenantId, tenantId),
              eq(categories.status, 'ACTIVE'),
              notInArray(categories.name, SYSTEM_CATEGORY_NAMES)
            )
          )
      case 'receivers':
        return select
          .from(receivers)
          .where(
            and(
              eq(receivers.tenantId, tenantId),
              eq(receivers.status, 'ACTIVE')
            )
          )
      case 'transactionLinkers':
        return select
          .from(transactionLinkers)
          .where(
            and(
              eq(transactionLinkers.tenantId, tenantId),
              eq(transactionLinkers.status, 'ACTIVE')
            )
          )
      case 'limits':
        return select
          .from(limits)
          .where(
            and(eq(limits.tenantId, tenantId), eq(limits.status, 'ACTIVE'))
          )
      case 'goals':
        return select
          .from(goals)
          .where(and(eq(goals.tenantId, tenantId), eq(goals.status, 'ACTIVE')))
      case 'recurringTransactions':
        return select
          .from(recurringTransactions)
          .where(
            and(
              eq(recurringTransactions.tenantId, tenantId),
              eq(recurringTransactions.status, 'ACTIVE')
            )
          )
    }
  }

  async usage(
    tenantId: number,
    kind: TenantUsageKind,
    period: string
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: tenantUsage.count })
      .from(tenantUsage)
      .where(
        and(
          eq(tenantUsage.tenantId, tenantId),
          eq(tenantUsage.kind, kind),
          eq(tenantUsage.period, period)
        )
      )

    return row?.count ?? 0
  }

  async incrementUsage(
    tenantId: number,
    kind: TenantUsageKind,
    period: string
  ): Promise<void> {
    await this.db
      .insert(tenantUsage)
      .values({ tenantId, kind, period, count: 1 })
      .onConflictDoUpdate({
        target: [tenantUsage.tenantId, tenantUsage.kind, tenantUsage.period],
        set: { count: sql`${tenantUsage.count} + 1` },
      })
  }
}
