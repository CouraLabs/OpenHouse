import type { Hono } from 'hono'
import { createApp } from './app.js'
import { isAppPath, serveApp } from './common/app-assets.js'
import type { AppEnv } from './common/context.js'
import { handleScheduled } from './jobs/scheduled.js'
import { handleQueue } from './jobs/consumer.js'

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
  async fetch(
    request: Request,
    env: AppEnv['Bindings'],
    execution: ExecutionContext
  ): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return getApp(env).fetch(request, env, execution)
    }

    if (isAppPath(pathname)) {
      return serveApp(env.ASSETS as Fetcher, request)
    }

    return (env.ASSETS as Fetcher).fetch(request)
  },

  async scheduled(
    event: ScheduledEvent,
    env: AppEnv['Bindings'],
    execution: ExecutionContext
  ): Promise<void> {
    await execution.waitUntil(handleScheduled(event.cron, env))
  },

  async queue(
    batch: MessageBatch<JobMessage>,
    env: AppEnv['Bindings'],
    execution: ExecutionContext
  ): Promise<void> {
    await execution.waitUntil(handleQueue(batch, env))
  },
}
