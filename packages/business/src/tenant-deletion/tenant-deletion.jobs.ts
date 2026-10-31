import {
  type Database,
  runBatch,
  SettingsRepository,
  TenantDeletionRepository,
} from '@workspace/db'

import { todayIn } from '../settings/settings.js'
import type { AuditRecorder } from '../ports/audit-recorder.js'
import type { Clock } from '../ports/clock.js'
import { isDeletionDue } from './tenant-deletion.js'

export async function deleteTenantNow(
  db: Database,
  clock: Clock,
  tenantId: number,
  audit: AuditRecorder
): Promise<void> {
  const tenants = new TenantDeletionRepository(db)
  const tenant = await tenants.find(tenantId)

  if (tenant === undefined || tenant.deletionDate === null) {
    return
  }

  const settings = await new SettingsRepository(db).findByTenant(tenantId)
  const today = todayIn(settings?.timezone ?? 'UTC', clock.now())

  if (!isDeletionDue(tenant.deletionDate, today)) {
    return
  }

  await runBatch(
    db,
    tenants.hardDeleteStatements(
      tenantId,
      audit.statement({
        tenantId,
        actorId: null,
        action: 'tenant.deleted',
        details: { deletionDate: tenant.deletionDate },
      })
    )
  )
}
