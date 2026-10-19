import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, count, eq, inArray, ne } from 'drizzle-orm'
import type {
  Currency,
  Database,
  DbOrTx,
  TenantSettingsRow,
} from '@workspace/db'
import { accounts, goals, limits, tenantSettings } from '@workspace/db'

/** The fields a settings write carries, beyond the audit stamps. */
export interface SettingsWrite {
  timezone: string
  mainCurrency: Currency
}

/**
 * The tenant settings rows — one per tenant. Every method takes the tenant
 * id explicitly; the repository never decides who is asking.
 *
 * Exported by `SettingsModule` so other features (the recurring job, the
 * sign-up) read and seed the settings through it.
 */
@Injectable()
export class SettingsRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Reads the tenant's settings row. */
  async findByTenant(
    tenantId: number,
    tx: DbOrTx = this.db
  ): Promise<TenantSettingsRow | undefined> {
    const [row] = await tx
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))

    return row
  }

  /** Reads the time zones of several tenants at once, keyed by tenant id. */
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

  /**
   * Inserts a new tenant's settings. A zone the signing-up browser sent
   * starts confirmed.
   */
  async insert(
    tenantId: number,
    data: SettingsWrite & { timezoneConfirmed: boolean },
    tx: DbOrTx = this.db
  ): Promise<TenantSettingsRow> {
    const [row] = await tx
      .insert(tenantSettings)
      .values({ tenantId, ...data })
      .returning()

    return row
  }

  /**
   * Counts what the main currency denominates — the tenant's ACTIVE limits
   * and goals — and, of the goals, those whose account is not in
   * `currency`. Read here rather than through the limits and goals
   * features: both read the main currency through this module, so
   * importing theirs back would close a module cycle.
   */
  async countDenominated(
    tenantId: number,
    currency: Currency
  ): Promise<{ limits: number; goals: number; goalsOffCurrency: number }> {
    const [[limitCount], [goalCount], [offCurrency]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(limits)
        .where(and(eq(limits.tenantId, tenantId), eq(limits.status, 'ACTIVE'))),
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

  /** Saves the settings an owner submitted; saving confirms the zone. */
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
