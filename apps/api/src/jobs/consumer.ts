import type { Database } from '@workspace/db'
import { createDatabase } from '@workspace/db'

import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { SystemClock } from '../common/clock/clock.js'
import type { AppEnv } from '../common/context.js'
import { config } from '../config/env.js'
import type { JobMessage } from '../index.js'
import { checkBalancesForTenant } from '../balances/balances.jobs.js'
import { runRecurringForTenant } from '../recurring-transactions/recurring.jobs.js'
import { runRemindersForTenant } from '../notifications/reminders.jobs.js'
import { deleteTenantNow } from '../tenant-deletion/tenant-deletion.jobs.js'

/**
 * The queue consumer: runs one tenant's job per message. Queues deliver at
 * least once, so every job is idempotent — a redelivered message redoes
 * nothing (the recurring materialization's unique index, the reminder
 * log's claim keys, a deletion that finds nothing left).
 *
 * A failed message retries with backoff (`max_retries` in wrangler.jsonc);
 * one failing tenant never stops the others in the batch.
 */
export async function handleQueue(
  batch: MessageBatch<JobMessage>,
  env: AppEnv['Bindings']
): Promise<void> {
  const db: Database = createDatabase(env.DB as never)
  const config_ = config(env)
  const clock = new SystemClock()
  const audit = new AuditLogService(new AuditLogRepository(db))

  for (const message of batch.messages) {
    const { kind, tenantId } = message.body

    try {
      switch (kind) {
        case 'recurring':
          await runRecurringForTenant(db, clock, tenantId)
          break
        case 'reminders':
          await runRemindersForTenant(db, config_, clock, tenantId)
          break
        case 'delete-tenant':
          await deleteTenantNow(db, clock, tenantId, audit)
          break
        case 'balances':
          await checkBalancesForTenant(db, tenantId)
          break
      }
    } catch (error) {
      console.error(`Job ${kind} for tenant ${tenantId} failed:`, error)
      message.retry()
    }
  }
}
