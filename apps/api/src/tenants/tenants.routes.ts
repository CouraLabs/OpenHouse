import { Hono } from 'hono'
import { toWireInviteCode, toWireUser } from '@workspace/business'
import type {
  CreateInviteCodeBody,
  InviteCode,
  TenantUser,
} from '@workspace/dto'
import { createInviteCodeSchema } from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { clientAddressOf } from '../common/rate-limit.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function tenantsRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.post('/invite-codes', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const body: CreateInviteCodeBody = await parseJsonBody(
      context,
      createInviteCodeSchema
    )

    await context.var.business.turnstile.verify(
      body.turnstileToken,
      'invite',
      clientAddressOf(context.req.raw)
    )

    const created = await context.var.business.inviteCodes.create(
      session.tenant.id,
      body.expiresInDays
    )

    return context.json(toWireInviteCode(created), 201)
  })

  router.get('/invite-codes', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const rows = await context.var.business.inviteCodes.list(session.tenant.id)

    return context.json(rows.map(toWireInviteCode))
  })

  router.delete(
    '/invite-codes/:id',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      await context.var.business.inviteCodes.revoke(session.tenant.id, id)

      return context.body(null, 204)
    }
  )

  router.get('/users', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const rows = await context.var.business.tenantUsers.list(session.tenant.id)

    return context.json(rows.map(toWireUser))
  })

  router.post(
    '/users/:id/deactivate',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      const row = await context.var.business.tenantUsers.deactivate(
        session.tenant.id,
        session.user.id,
        id
      )

      return context.json(toWireUser(row))
    }
  )

  router.post(
    '/users/:id/anonymize',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      const row = await context.var.business.tenantUsers.anonymize(
        session.tenant.id,
        session.user.id,
        id
      )

      return context.json(toWireUser(row))
    }
  )

  router.post(
    '/users/:id/reactivate',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      const row = await context.var.business.tenantUsers.reactivate(
        session.tenant.id,
        id
      )

      return context.json(toWireUser(row))
    }
  )

  return router
}
