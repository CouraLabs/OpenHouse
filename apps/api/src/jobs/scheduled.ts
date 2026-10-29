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

/**
 * The cron trigger handler: given the cron expression that fired, lists the
 * tenants it touches and enqueues one message per tenant. The cron never
 * runs tenant logic itself — it only lists and enqueues, keeping each
 * invocation inside the CPU and subrequest limits, and a failing tenant's
 * job retries alone.
 */

/** The queue producer binding, typed structurally. */
interface QueueProducer {
  sendBatch(messages: Array<{ kind: string; tenantId: number }>): Promise<void>
}

/** The jobs each cron expression fans out. */
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

/** Enqueues one message per tenant — `sendBatch` caps at 100, so chunk. */
export async function handleScheduled(
  cron: string,
  env: AppEnv['Bindings']
): Promise<void> {
  const db = createDatabase(env.DB as never)
  const { kind, tenants } = await tenantsForCron(db, cron)

  // The daily balances run is also the size watch: once a day, the row
  // counts go to the logs (the byte ceiling is read with `wrangler d1
  // info`; see docs/operations.md).
  if (kind === 'balances') {
    await logDatabaseSize(db)
  }

  if (tenants.length === 0) {
    return
  }

  const queue = env.JOBS as QueueProducer | undefined

  if (queue === undefined) {
    // A deployment without the queue binding: nothing fans out. (The
    // binding is static in wrangler.jsonc; this guards a harness.)
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

