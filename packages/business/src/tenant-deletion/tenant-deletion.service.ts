import {
  type Database,
  runBatch,
  type SettingsRepository,
  type TenantDeletionRepository,
} from '@workspace/db'
import type { TenantDeletion } from '@workspace/dto'

import { todayIn } from '../settings/settings.js'
import { ConflictError, NotFoundError } from '../errors.js'
import type { AuditRecorder } from '../ports/audit-recorder.js'
import type { Clock } from '../ports/clock.js'
import { deletionDateFrom, tenantNameMatches } from './tenant-deletion.js'

export class TenantDeletionService {
  constructor(
    private readonly db: Database,
    private readonly tenants: TenantDeletionRepository,
    private readonly settings: SettingsRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock
  ) {}

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
      throw new ConflictError('The name does not match the tenant.')
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

    return { deletionDate, deletesOn: deletionDate }
  }

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
