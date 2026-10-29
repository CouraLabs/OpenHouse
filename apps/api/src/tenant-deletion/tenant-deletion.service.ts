import {
  deletionDateFrom,
  isDeletionDue,
  tenantNameMatches,
  todayIn,
  type TenantDeletion,
} from '@workspace/poco'

import type { Database } from '@workspace/db'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { runBatch } from '../common/ledger/ledger-batch.js'
import { NotFoundError, BadRequestError, ConflictError } from '../common/errors.js'
import { TenantDeletionRepository } from './tenant-deletion.repository.js'

/**
 * Tenant deletion: the owner schedules it by typing the tenant's name, the
 * data is hard-deleted 30 days later by a daily job that reads each tenant's
 * own calendar day, and the owner can cancel until then. The one sanctioned
 * exception to soft delete.
 */
export class TenantDeletionService {

  constructor(
    private readonly db: Database,
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
      throw new NotFoundError('Tenant not found.')
    }
    if (!tenantNameMatches(typedName, tenant.name)) {
      throw new BadRequestError('The name does not match the tenant.')
    }
    if (tenant.deletionDate !== null) {
      throw new ConflictError('The deletion is already scheduled.')
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
      throw new NotFoundError('No deletion is scheduled.')
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

}
