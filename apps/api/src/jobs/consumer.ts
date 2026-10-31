import { businessFromEnv } from '../common/runtime.middleware.js'
import type { AppEnv } from '../common/context.js'
import type { JobMessage } from '../index.js'

export async function handleQueue(
  batch: MessageBatch<JobMessage>,
  env: AppEnv['Bindings']
): Promise<void> {
  const { jobs } = businessFromEnv(env)

  for (const message of batch.messages) {
    const { kind, tenantId } = message.body

    try {
      switch (kind) {
        case 'recurring':
          await jobs.runRecurringForTenant(tenantId)
          break
        case 'reminders':
          await jobs.runRemindersForTenant(tenantId)
          break
        case 'delete-tenant':
          await jobs.deleteTenantNow(tenantId)
          break
        case 'balances':
          await jobs.checkBalancesForTenant(tenantId)
          break
      }
    } catch (error) {
      console.error(`Job ${kind} for tenant ${tenantId} failed:`, error)
      message.retry()
    }
  }
}
