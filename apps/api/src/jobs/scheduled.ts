import type { Business } from '@workspace/business'

import type { AppEnv } from '../common/context.js'
import { businessFromEnv } from '../common/runtime.middleware.js'
import type { JobMessage } from '../index.js'

interface QueueProducer {
  sendBatch(messages: Array<{ kind: string; tenantId: number }>): Promise<void>
}

async function tenantsForCron(
  jobs: Business['jobs'],
  cron: string
): Promise<{ kind: JobMessage['kind']; tenants: number[] }> {
  if (cron.startsWith('30 ')) {
    return { kind: 'recurring', tenants: await jobs.listTenantsWithActiveRules() }
  }

  if (cron.startsWith('45 ')) {
    return { kind: 'reminders', tenants: await jobs.listAllTenants() }
  }

  if (cron.startsWith('15 3')) {
    return { kind: 'balances', tenants: await jobs.listAllTenants() }
  }

  return {
    kind: 'delete-tenant',
    tenants: (await jobs.listTenantsScheduledForDeletion()).map(
      (tenant) => tenant.tenantId
    ),
  }
}

export async function handleScheduled(
  cron: string,
  env: AppEnv['Bindings']
): Promise<void> {
  const { jobs } = businessFromEnv(env)
  const { kind, tenants } = await tenantsForCron(jobs, cron)

  if (kind === 'balances') {
    await jobs.logDatabaseSize()
    await jobs.pruneSignInAttempts()
  }

  if (tenants.length === 0) {
    return
  }

  const queue = env.JOBS as QueueProducer | undefined

  if (queue === undefined) {
    return
  }

  for (let start = 0; start < tenants.length; start += 100) {
    await queue.sendBatch(
      tenants.slice(start, start + 100).map((tenantId) => ({
        kind,
        tenantId,
      }))
    )
  }
}
