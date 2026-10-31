import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { csrf } from 'hono/csrf'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { createMiddleware } from 'hono/factory'

import type { AppEnv } from './common/context.js'
import { config } from './config/env.js'
import { DomainError, LedgerConflictError } from '@workspace/business'
import { renderError } from './common/error-response.js'
import { authMiddleware } from './common/session/auth.middleware.js'
import { clientAddressOf, limitRequest } from './common/rate-limit.js'
import {
  businessOptions,
  runtimeMiddleware,
} from './common/runtime.middleware.js'
import { authRoutes } from './auth/auth.routes.js'
import { tenantsRoutes } from './tenants/tenants.routes.js'
import { tenantDeletionRoutes } from './tenant-deletion/tenant-deletion.routes.js'
import { settingsRoutes } from './settings/settings.routes.js'
import { preferencesRoutes } from './preferences/preferences.routes.js'
import { categoriesRoutes } from './categories/categories.routes.js'
import { receiversRoutes } from './receivers/receivers.routes.js'
import { transactionLinkersRoutes } from './transaction-linkers/transaction-linkers.routes.js'
import { accountRoutes } from './accounts/account.routes.js'
import { limitRoutes } from './limits/limit.routes.js'
import { goalRoutes } from './goals/goal.routes.js'
import { balancesRoutes } from './balances/balances.routes.js'
import { creditCardStatementRoutes } from './credit-card-statements/credit-card-statements.routes.js'
import { transactionsRoutes } from './transactions/transactions.routes.js'
import { recurringTransactionRoutes } from './recurring-transactions/recurring-transactions.routes.js'
import { upcomingRoutes } from './upcoming/upcoming.routes.js'
import { householdRoutes } from './household/household.routes.js'
import { notificationsRoutes } from './notifications/notifications.routes.js'
import { calendarRoutes } from './calendar/calendar.routes.js'
import { statementImportsRoutes } from './statement-imports/statement-imports.routes.js'
import { dataExportsRoutes } from './data-exports/data-exports.routes.js'
import { tiersRoutes } from './tiers/tiers.routes.js'
import {
  meterUsage,
  requireCapacity,
  requireUserSeat,
} from './common/tiers/tier-gate.middleware.js'
import type { TierResource } from '@workspace/dto'

const TIER_RESOURCE_PATHS: ReadonlyArray<readonly [string, TierResource]> = [
  ['/accounts', 'accounts'],
  ['/categories', 'categories'],
  ['/receivers', 'receivers'],
  ['/transaction-linkers', 'transactionLinkers'],
  ['/limits', 'limits'],
  ['/goals', 'goals'],
  ['/recurring-transactions', 'recurringTransactions'],
]

const EXPORT_PATHS = [
  '/data-exports',
  ...TIER_RESOURCE_PATHS.filter(
    ([path]) => path !== '/transaction-linkers'
  ).map(([path]) => `${path}/export`),
  '/transactions/export',
]

export function createApp(env: AppEnv['Bindings']): {
  app: Hono<AppEnv>
} {
  const app = new Hono<AppEnv>().basePath('/api')

  const parsed = config(env)
  const production = parsed.environment === 'production'

  app.use(requestId())
  app.use(
    secureHeaders(
      production
        ? {
            strictTransportSecurity: 'max-age=31536000; includeSubDomains',
            crossOriginResourcePolicy: 'same-origin',
          }
        : { strictTransportSecurity: false }
    )
  )

  if (production) {
    app.use(csrf({ origin: new URL(parsed.mail.appUrl).origin }))
  }

  app.use(runtimeMiddleware(businessOptions(parsed, env)))

  app.use(
    createMiddleware<AppEnv>(async (context, next) => {
      await limitRequest(env, 'general', clientAddressOf(context.req.raw))

      const started = Date.now()

      await next()

      const session = context.get('session') as
        { tenant?: { id: number } } | undefined

      console.log(
        JSON.stringify({
          requestId: context.get('requestId'),
          method: context.req.method,
          route: context.req.path,
          status: context.res.status,
          durationMs: Date.now() - started,
          ...(session?.tenant === undefined
            ? {}
            : { tenantId: session.tenant.id }),
        })
      )
    })
  )

  const { publicRouter, protectedRouter } = authRoutes()
  const calendar = calendarRoutes()

  app.route('/auth', publicRouter)

  app.route('/calendar', calendar.publicRouter)

  const authenticated = new Hono<AppEnv>()
  authenticated.use(authMiddleware())
  authenticated.route('/auth', protectedRouter)

  authenticated.route('/tiers', tiersRoutes())

  for (const [path, resource] of TIER_RESOURCE_PATHS) {
    authenticated.post(path, requireCapacity(resource))
  }
  for (const path of EXPORT_PATHS) {
    authenticated.post(path, meterUsage('export'))
  }
  authenticated.post('/imports/commit', meterUsage('import'))
  authenticated.post('/tenants/invite-codes', requireUserSeat())

  authenticated.route('/tenants', tenantsRoutes())
  authenticated.route('/tenant-deletion', tenantDeletionRoutes())
  authenticated.route('/settings', settingsRoutes())
  authenticated.route('/preferences', preferencesRoutes())
  authenticated.route('/categories', categoriesRoutes().router)
  authenticated.route('/receivers', receiversRoutes().router)
  authenticated.route(
    '/transaction-linkers',
    transactionLinkersRoutes().router
  )

  authenticated.route('/accounts', accountRoutes())

  authenticated.route('/limits', limitRoutes())

  authenticated.route('/goals', goalRoutes())

  authenticated.route('/balances', balancesRoutes())

  authenticated.route('/credit-card-statements', creditCardStatementRoutes())

  const transactions = transactionsRoutes()
  authenticated.route('/transactions', transactions.router)
  authenticated.route('/reconciliation', transactions.reconciliationRouter)

  authenticated.route(
    '/recurring-transactions',
    recurringTransactionRoutes().router
  )
  authenticated.route('/upcoming', upcomingRoutes().router)

  authenticated.route('/household', householdRoutes())

  authenticated.route('/notifications', notificationsRoutes())
  authenticated.route('/calendar', calendar.protectedRouter)

  authenticated.route('/imports', statementImportsRoutes().router)
  authenticated.route('/data-exports', dataExportsRoutes().router)

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
    if (error instanceof HTTPException) {
      return error.getResponse()
    }

    if (error instanceof LedgerConflictError) {
      return renderError(context, error.message, 409)
    }

    if (error instanceof DomainError) {
      return renderError(context, error.payload, error.status)
    }

    console.error(
      JSON.stringify({
        kind: 'unhandled',
        requestId: context.get('requestId'),
        method: context.req.method,
        route: context.req.path,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    )

    return context.json(
      {
        message: 'Something went wrong on our side.',
        error: 'Internal Server Error',
        statusCode: 500,
        requestId: context.get('requestId'),
        ...(production
          ? {}
          : {
              detail: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            }),
      },
      500
    )
  })

  return { app }
}
