import type { Database } from '@workspace/db'
import { createDatabase } from '@workspace/db'

import type { AppEnv } from '../common/context.js'
import type { JobMessage } from '../index.js'
import {
  listAllTenants,
  listTenantsScheduledForDeletion,
  listTenantsWithActiveRules,
} from './tenants.js'
import { logDatabaseSize } from './size-watch.js'
import { SignInAttemptRepository } from '../auth/sign-in-attempt.repository.js'
import { SIGN_IN_ATTEMPT_RETENTION_MS } from '../auth/sign-in-captcha-policy.js'

interface QueueProducer {
  sendBatch(messages: Array<{ kind: string; tenantId: number }>): Promise<void>
}

async function tenantsForCron(
  db: Database,
  cron: string
): Promise<{ kind: JobMessage['kind']; tenants: number[] }> {
  if (cron.startsWith('30 ')) {
    return { kind: 'recurring', tenants: await listTenantsWithActiveRules(db) }
  }

  if (cron.startsWith('45 ')) {
    return { kind: 'reminders', tenants: await listAllTenants(db) }
  }

  if (cron.startsWith('15 3')) {
    return { kind: 'balances', tenants: await listAllTenants(db) }
  }

  return {
    kind: 'delete-tenant',
    tenants: (await listTenantsScheduledForDeletion(db)).map(
      (tenant) => tenant.tenantId
    ),
  }
}

export async function handleScheduled(
  cron: string,
  env: AppEnv['Bindings']
): Promise<void> {
  const db = createDatabase(env.DB as never)
  const { kind, tenants } = await tenantsForCron(db, cron)

  if (kind === 'balances') {
    await logDatabaseSize(db)
    await new SignInAttemptRepository(db).deleteOlderThan(
      new Date(Date.now() - SIGN_IN_ATTEMPT_RETENTION_MS)
    )
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

