import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { eq, inArray } from 'drizzle-orm'
import type { Currency, Database, TenantSettingsRow } from '@workspace/db'
import { tenantSettings } from '@workspace/db'

/** The database or an open transaction — a sign-up writes the settings row
 * inside the transaction that creates the tenant. */
type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0]

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
