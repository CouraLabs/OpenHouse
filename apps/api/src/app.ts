import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { createMiddleware } from 'hono/factory'

import type { AppEnv } from './common/context.js'
import type { SessionResolver } from './common/session/session-resolver.js'
import { createDatabase } from '@workspace/db'
import { config } from './config/env.js'
import { DomainError } from './common/errors.js'
import { LedgerConflictError } from './common/ledger/ledger-conflict.js'
import { authMiddleware } from './common/session/auth.middleware.js'
import { clientAddressOf, limitRequest } from './common/rate-limit.js'
import { SystemClock } from './common/clock/clock.js'
import { authDeps } from './auth/auth.deps.js'
import { tenantsDeps } from './tenants/tenants.deps.js'
import { settingsDeps } from './settings/settings.deps.js'
import { preferencesDeps } from './preferences/preferences.deps.js'
import { categoriesDeps } from './categories/categories.deps.js'
import { receiversDeps } from './receivers/receivers.deps.js'
import { transactionLinkersDeps } from './transaction-linkers/transaction-linkers.deps.js'
import { accountDeps } from './accounts/account.deps.js'
import { limitDeps } from './limits/limit.deps.js'
import { goalDeps } from './goals/goal.deps.js'
import { balancesDeps } from './balances/balances.deps.js'
import { creditCardStatementDeps } from './credit-card-statements/credit-card-statements.deps.js'
import { transactionsDeps } from './transactions/transactions.deps.js'
import { recurringTransactionsDeps } from './recurring-transactions/recurring-transactions.deps.js'
import { upcomingDeps } from './upcoming/upcoming.deps.js'
import { householdDeps } from './household/household.deps.js'
import { notificationsDeps } from './notifications/notifications.deps.js'
import { calendarDeps } from './calendar/calendar.deps.js'
import { statementImportsDeps } from './statement-imports/statement-imports.deps.js'
import { dataExportsDeps } from './data-exports/data-exports.deps.js'

export function createApp(env: AppEnv['Bindings']): {
  app: Hono<AppEnv>
  sessions: SessionResolver
} {
  const app = new Hono<AppEnv>().basePath('/api')

  app.use(secureHeaders())

  const parsed = config(env)

  const db = createDatabase(env.DB as never)

  app.use(
    createMiddleware<AppEnv>(async (context, next) => {
      context.set('db', db)
      context.set('config', parsed)

      await limitRequest(env, 'general', clientAddressOf(context.req.raw))

      const started = Date.now()

      await next()

      const session = context.get('session') as { tenant?: { id: number } } | undefined

      console.log(
        JSON.stringify({
          method: context.req.method,
          route: context.req.path,
          status: context.res.status,
          durationMs: Date.now() - started,
          ...(session?.tenant === undefined ? {} : { tenantId: session.tenant.id }),
        })
      )
    })
  )

  const clock = new SystemClock()
  const { publicRouter, protectedRouter, sessions } = authDeps(db, parsed, clock)

  app.route('/auth', publicRouter)

  app.route('/calendar', calendarDeps(db, parsed, clock).publicRouter)

  const authenticated = new Hono<AppEnv>()
  authenticated.use(authMiddleware(sessions))
  authenticated.route('/auth', protectedRouter)

  const deps = { db, config: parsed, clock }

  authenticated.route('/tenants', tenantsDeps(deps.db, deps.config, clock).router)
  authenticated.route('/settings', settingsDeps(deps.db, deps.config, clock).router)
  authenticated.route('/preferences', preferencesDeps(deps.db, deps.config, clock).router)
  authenticated.route('/categories', categoriesDeps(deps.db, deps.config, clock).router)
  authenticated.route('/receivers', receiversDeps(deps.db, deps.config, clock).router)
  authenticated.route('/transaction-linkers', transactionLinkersDeps(deps.db, deps.config, clock).router)

  const accounts = accountDeps(deps.db, deps.config, clock)
  authenticated.route('/accounts', accounts.router)

  const limits = limitDeps(deps.db, deps.config, clock)
  authenticated.route('/limits', limits.router)

  const goals = goalDeps(deps.db, deps.config, clock)
  authenticated.route('/goals', goals.router)

  const balances = balancesDeps(deps.db, deps.config, clock)
  authenticated.route('/balances', balances.router)

  const statements = creditCardStatementDeps(deps.db, deps.config, clock)
  authenticated.route('/credit-card-statements', statements.router)

  const transactions = transactionsDeps(deps.db, deps.config, clock)
  authenticated.route('/transactions', transactions.router)
  authenticated.route('/reconciliation', transactions.reconciliationRouter)

  authenticated.route(
    '/recurring-transactions',
    recurringTransactionsDeps(deps.db, deps.config, clock).router
  )
  authenticated.route('/upcoming', upcomingDeps(deps.db, deps.config, clock).router)

  const household = householdDeps(deps.db, deps.config, clock)
  authenticated.route('/household', household.router)

  authenticated.route('/notifications', notificationsDeps(deps.db, deps.config, clock).router)
  authenticated.route('/calendar', calendarDeps(deps.db, deps.config, clock).protectedRouter)

  authenticated.route('/imports', statementImportsDeps(deps.db, deps.config, clock).router)
  authenticated.route('/data-exports', dataExportsDeps(deps.db, deps.config, clock).router)

  app.route('/', authenticated)

  app.get('/health', (context) => context.json({ status: 'ok' }))

  app.notFound((context) =>
    context.json(
      {
        message: `Cannot ${context.req.method} ${context.req.path}`,
        error: 'Not Found',
        statusCode: 404,
      },
      404
    )
  )

  app.onError((error, context) => {
    if (error instanceof LedgerConflictError) {
      return renderError(context, error.message, 409)
    }

    if (error instanceof DomainError) {
      return renderError(context, error.payload, error.status)
    }

    console.error(
      `Unhandled error on ${context.req.method} ${context.req.path}:`,
      error
    )

    return context.json(
      {
        message: 'Something went wrong on our side.',
        error: 'Internal Server Error',
        statusCode: 500,
      },
      500
    )
  })

  return { app, sessions }
}

function renderError(
  context: import('hono').Context<AppEnv>,
  payload: unknown,
  status: 400 | 401 | 403 | 404 | 409 | 429
): Response {
  if (typeof payload === 'string') {
    return context.json(
      { message: payload, error: statusText(status), statusCode: status },
      status
    )
  }

  return context.json(payload as Record<string, unknown>, status)
}

function statusText(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request'
    case 401:
      return 'Unauthorized'
    case 403:
      return 'Forbidden'
    case 404:
      return 'Not Found'
    case 409:
      return 'Conflict'
    case 429:
      return 'Too Many Requests'
    default:
      return 'Error'
  }
}
