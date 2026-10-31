import { and, count, eq, inArray, ne } from 'drizzle-orm'
import type { Currency, UnsplitMode } from '@workspace/domain'
import type { Database } from '../../database.js'
import {
  accounts,
  goals,
  limits,
  tenantSettings,
  type TenantSettingsRow,
} from '../../schema.js'

export interface SettingsWrite {
  timezone: string
  mainCurrency: Currency
  unsplitMode?: UnsplitMode
}

export class SettingsRepository {
  constructor(private readonly db: Database) {}

  async findByTenant(
    tenantId: number
  ): Promise<TenantSettingsRow | undefined> {
    const [row] = await this.db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))

    return row
  }

  async timezonesOf(
    tenantIds: readonly number[]
  ): Promise<Map<number, string>> {
    if (tenantIds.length === 0) {
      return new Map()
    }

    const rows = await this.db
      .select({
        tenantId: tenantSettings.tenantId,
        timezone: tenantSettings.timezone,
      })
      .from(tenantSettings)
      .where(inArray(tenantSettings.tenantId, [...tenantIds]))

    return new Map(rows.map((row) => [row.tenantId, row.timezone]))
  }

  async insert(
    tenantId: number,
    data: SettingsWrite & { timezoneConfirmed: boolean }
  ): Promise<TenantSettingsRow> {
    const [row] = await this.db
      .insert(tenantSettings)
      .values({ tenantId, ...data })
      .returning()

    return row
  }

  insertStatement(
    tenantId: number,
    data: SettingsWrite & { timezoneConfirmed: boolean }
  ) {
    return this.db
      .insert(tenantSettings)
      .values({ tenantId, ...data })
      .returning()
  }

  async countDenominated(
    tenantId: number,
    currency: Currency
  ): Promise<{ limits: number; goals: number; goalsOffCurrency: number }> {
    const [[limitCount], [goalCount], [offCurrency]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(limits)
        .where(
          and(eq(limits.tenantId, tenantId), eq(limits.status, 'ACTIVE'))
        ),
      this.db
        .select({ value: count() })
        .from(goals)
        .where(and(eq(goals.tenantId, tenantId), eq(goals.status, 'ACTIVE'))),
      this.db
        .select({ value: count() })
        .from(goals)
        .innerJoin(accounts, eq(goals.linkedAccountId, accounts.id))
        .where(
          and(
            eq(goals.tenantId, tenantId),
            eq(goals.status, 'ACTIVE'),
            ne(accounts.currency, currency)
          )
        ),
    ])

    return {
      limits: limitCount.value,
      goals: goalCount.value,
      goalsOffCurrency: offCurrency.value,
    }
  }

  async update(
    tenantId: number,
    userId: number,
    data: SettingsWrite
  ): Promise<TenantSettingsRow | undefined> {
    const [row] = await this.db
      .update(tenantSettings)
      .set({
        ...data,
        timezoneConfirmed: true,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(eq(tenantSettings.tenantId, tenantId))
      .returning()

    return row
  }
}
