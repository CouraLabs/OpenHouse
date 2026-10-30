import type { Database } from '@workspace/db'
import { isDeletionDue, todayIn } from '@workspace/poco'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { runBatch } from '../common/ledger/ledger-batch.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TenantDeletionRepository } from './tenant-deletion.repository.js'

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
