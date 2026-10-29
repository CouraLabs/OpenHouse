import type { Database } from '@workspace/db'
import { isDeletionDue, todayIn } from '@workspace/poco'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { runBatch } from '../common/ledger/ledger-batch.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TenantDeletionRepository } from './tenant-deletion.repository.js'

/**
 * The per-tenant job the deletion cron fans out to: the tenant's own
 * calendar day decides whether its deletion is due (rule 6c); the delete
 * itself is one batch, children first, the `tenants` row last, with the
 * audit line riding it. Idempotent — a redelivered message finds nothing
 * (or nothing due) and does nothing.
 */
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

  // The audit line rides the delete's batch — the log outlives the tenant.
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
