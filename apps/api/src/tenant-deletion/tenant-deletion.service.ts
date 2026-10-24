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

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { SettingsRepository } from '../settings/settings.repository.js'
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
    return this.tenants.transaction(async (tx) => {
      const tenant = await this.tenants.find(tenantId, tx)
      if (tenant === undefined) {
        throw new NotFoundException('Tenant not found.')
      }
      if (!tenantNameMatches(typedName, tenant.name)) {
        throw new BadRequestException('The name does not match the tenant.')
      }
      if (tenant.deletionDate !== null) {
        throw new ConflictException('The deletion is already scheduled.')
      }

      const settings = await this.settings.findByTenant(tenantId, tx)
      const today = todayIn(settings?.timezone ?? 'UTC', this.clock.now())
      const deletionDate = deletionDateFrom(today)

      await this.tenants.setDeletionDate(tenantId, deletionDate, tx)
      await this.audit.record(
        {
          tenantId,
          actorId,
          action: 'tenant.deletion_scheduled',
          details: { deletionDate },
        },
        tx
      )

      return { deletionDate }
    })
  }

  /** Cancels a scheduled deletion; the data stays. */
  async cancel(tenantId: number, actorId: number): Promise<void> {
    await this.tenants.transaction(async (tx) => {
      const tenant = await this.tenants.find(tenantId, tx)
      if (tenant?.deletionDate == null) {
        throw new NotFoundException('No deletion is scheduled.')
      }

      await this.tenants.setDeletionDate(tenantId, null, tx)
      await this.audit.record(
        { tenantId, actorId, action: 'tenant.deletion_canceled' },
        tx
      )
    })
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
        await this.tenants.transaction(async (tx) => {
          await this.tenants.hardDelete(tenant.id, tx)
          await this.audit.record(
            {
              tenantId: tenant.id,
              actorId: null,
              action: 'tenant.deleted',
              details: { deletionDate: tenant.deletionDate },
            },
            tx
          )
        })
        deleted += 1
      } catch (error) {
        this.logger.error(`Deleting tenant ${tenant.id} failed.`, error)
      }
    }

    return deleted
  }
}
