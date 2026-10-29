import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import {
  deletionDateFrom,
  isDeletionDue,
  tenantNameMatches,
  todayIn,
  type TenantDeletion,
} from '@workspace/poco'

import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { runBatch } from '../common/ledger/ledger-batch.js'
import { TenantDeletionRepository } from './tenant-deletion.repository.js'

/**
 * Tenant deletion: the owner schedules it by typing the tenant's name, the
 * data is hard-deleted 30 days later by a daily job that reads each tenant's
 * own calendar day, and the owner can cancel until then. The one sanctioned
 * exception to soft delete.
 */
@Injectable()
export class TenantDeletionService {
  private readonly logger = new Logger(TenantDeletionService.name)

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly tenants: TenantDeletionRepository,
    private readonly settings: SettingsRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock
  ) {}

  /** Schedules the deletion 30 days ahead, in the tenant's calendar. */
  async schedule(
    tenantId: number,
    actorId: number,
    typedName: string
  ): Promise<TenantDeletion> {
    const tenant = await this.tenants.find(tenantId)
    if (tenant === undefined) {
      throw new NotFoundException('Tenant not found.')
    }
    if (!tenantNameMatches(typedName, tenant.name)) {
      throw new BadRequestException('The name does not match the tenant.')
    }
    if (tenant.deletionDate !== null) {
      throw new ConflictException('The deletion is already scheduled.')
    }

    const settings = await this.settings.findByTenant(tenantId)
    const today = todayIn(settings?.timezone ?? 'UTC', this.clock.now())
    const deletionDate = deletionDateFrom(today)

    await runBatch(this.db, [
      this.tenants.setDeletionDateStatement(tenantId, deletionDate),
      this.audit.statement({
        tenantId,
        actorId,
        action: 'tenant.deletion_scheduled',
        details: { deletionDate },
      }),
    ])

    return { deletionDate }
  }

  /** Cancels a scheduled deletion; the data stays. */
  async cancel(tenantId: number, actorId: number): Promise<void> {
    const tenant = await this.tenants.find(tenantId)
    if (tenant?.deletionDate == null) {
      throw new NotFoundException('No deletion is scheduled.')
    }

    await runBatch(this.db, [
      this.tenants.setDeletionDateStatement(tenantId, null),
      this.audit.statement({
        tenantId,
        actorId,
        action: 'tenant.deletion_canceled',
      }),
    ])
  }

  /**
   * Deletes every tenant whose day has come in its own time zone; answers
   * how many it deleted. The job runs hourly so every zone's new day is
   * picked up soon after its midnight (a "daily" job per calendar day), and
   * it is idempotent: a deleted tenant is simply no longer listed. One
   * failing tenant never stops the others.
   */
  @Cron('0 15 * * * *')
  async deleteDue(): Promise<number> {
    const now = this.clock.now()
    const scheduled = await this.tenants.listScheduled()
    const zones = await this.settings.timezonesOf(
      scheduled.map((tenant) => tenant.id)
    )
    let deleted = 0

    for (const tenant of scheduled) {
      const today = todayIn(zones.get(tenant.id) ?? 'UTC', now)
      if (!isDeletionDue(tenant.deletionDate, today)) {
        continue
      }

      try {
        await runBatch(
          this.db,
          this.tenants.hardDeleteStatements(
            tenant.id,
            this.audit.statement({
              tenantId: tenant.id,
              actorId: null,
              action: 'tenant.deleted',
              details: { deletionDate: tenant.deletionDate },
            })
          )
        )
        deleted += 1
      } catch (error) {
        this.logger.error(`Deleting tenant ${tenant.id} failed.`, error)
      }
    }

    return deleted
  }
}
