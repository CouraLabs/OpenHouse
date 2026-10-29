import type { Hono } from 'hono'
import { createApp } from './app.js'
import type { AppEnv } from './common/context.js'
import { handleScheduled } from './jobs/scheduled.js'
import { handleQueue } from './jobs/consumer.js'

/**
 * The Worker entry: the fetch handler hands the request to the Hono app —
 * the API under `/api`, the web app's static assets everywhere else — while
 * `scheduled` and `queue` are the two background entries: the cron triggers
 * fan jobs per tenant into the queue, and the consumer runs them.
 *
 * The app is built once per isolate and cached: the bindings are stable,
 * and the parsed config caches with it.
 */

/** The message a cron enqueues: which tenant, what to run. Queues deliver
 * at least once, so every job is idempotent. */
export interface JobMessage {
  kind: 'recurring' | 'reminders' | 'delete-tenant' | 'balances'
  tenantId: number
}

let cachedApp: Hono<AppEnv> | undefined

function getApp(env: AppEnv['Bindings']): Hono<AppEnv> {
  cachedApp ??= createApp(env).app

  return cachedApp
}

export default {
  /** The API under `/api`; the web app's static assets everywhere else,
   * with the SPA fallback the assets configuration carries. */
  async fetch(
    request: Request,
    env: AppEnv['Bindings'],
    execution: ExecutionContext
  ): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return getApp(env).fetch(request, env, execution)
    }

    return (env.ASSETS as Fetcher).fetch(request)
  },

  /** The cron triggers: list the tenants each schedule touches and enqueue
   * one message per tenant, so every invocation stays inside the CPU and
   * subrequest limits and a failing tenant never stops the others. */
  async scheduled(
    event: ScheduledEvent,
    env: AppEnv['Bindings'],
    execution: ExecutionContext
  ): Promise<void> {
    await execution.waitUntil(handleScheduled(event.cron, env))
  },

  /** The queue consumer: runs the per-tenant job. Idempotent — Queues
   * deliver at least once. */
  async queue(
    batch: MessageBatch<JobMessage>,
    env: AppEnv['Bindings'],
    execution: ExecutionContext
  ): Promise<void> {
    await execution.waitUntil(handleQueue(batch, env))
  },
}
