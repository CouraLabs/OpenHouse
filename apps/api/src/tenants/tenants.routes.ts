import { Hono } from 'hono'
import type { TenantCode } from '@workspace/db'
import type {
  CreateInviteCodeBody,
  InviteCode,
  TenantUser,
} from '@workspace/poco'
import { createInviteCodeSchema } from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { InviteCodeService } from './invite-code.service.js'
import type { TenantUserRow } from './tenant-user.repository.js'
import type { TenantUserService } from './tenant-user.service.js'

/**
 * The tenant-scoped routes, all owner-only: invite codes and the tenant's
 * users. Everything here reads the tenant from the session, so an owner can
 * only ever see or act on their own tenant — the client names no tenant
 * anywhere.
 */
export function tenantsRoutes(deps: {
  inviteCodes: InviteCodeService
  tenantUsers: TenantUserService
}): App {
  const router: App = new Hono<AppEnv>()

  /** Generates the code the next users of the tenant sign up with. */
  router.post(
    '/invite-codes',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const body: CreateInviteCodeBody = await parseJsonBody(
        context,
        createInviteCodeSchema
      )

      const created = await deps.inviteCodes.create(
        session.tenant.id,
        body.expiresInDays
      )

      return context.json(toWireInviteCode(created), 201)
    }
  )

  /** Lists the codes the tenant has issued, newest first. */
  router.get('/invite-codes', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const rows = await deps.inviteCodes.list(session.tenant.id)

    return context.json(rows.map(toWireInviteCode))
  })

  /** Revokes an open code: it expires now. */
  router.delete(
    '/invite-codes/:id',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      await deps.inviteCodes.revoke(session.tenant.id, id)

      return context.body(null, 204)
    }
  )

  /** Lists the tenant's users, removed ones included. */
  router.get('/users', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const rows = await deps.tenantUsers.list(session.tenant.id)

    return context.json(rows.map(toWireUser))
  })

  /** Removes a user: inactive and signed out, their history intact. */
  router.post(
    '/users/:id/deactivate',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      const row = await deps.tenantUsers.deactivate(
        session.tenant.id,
        session.user.id,
        id
      )

      return context.json(toWireUser(row))
    }
  )

  /** Anonymizes a removed member: name, email, and password hash go, the
   * rows they created stay. */
  router.post(
    '/users/:id/anonymize',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      const row = await deps.tenantUsers.anonymize(
        session.tenant.id,
        session.user.id,
        id
      )

      return context.json(toWireUser(row))
    }
  )

  /** Restores a removed user. */
  router.post(
    '/users/:id/reactivate',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const id = Number.parseInt(context.req.param('id') ?? '', 10)

      const row = await deps.tenantUsers.reactivate(session.tenant.id, id)

      return context.json(toWireUser(row))
    }
  )

  return router
}

/** Maps a code row onto its wire shape. */
function toWireInviteCode(row: TenantCode): InviteCode {
  return {
    id: row.id,
    code: row.code,
    usedAt: row.usedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Maps a user row onto its wire shape. */
function toWireUser(row: TenantUserRow): TenantUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    anonymizedAt: row.anonymizedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
