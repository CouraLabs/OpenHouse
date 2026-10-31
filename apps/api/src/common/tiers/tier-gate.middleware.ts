import { createMiddleware } from 'hono/factory'
import type { TierResource, TierUsageKind } from '@workspace/dto'

import type { AppEnv } from '../context.js'

export function requireCapacity(resource: TierResource) {
  return createMiddleware<AppEnv>(async (context, next) => {
    await context.var.business.tiers.assertCanAdd(
      context.get('session').tenant.id,
      resource
    )
    await next()
  })
}

export function requireUserSeat() {
  return createMiddleware<AppEnv>(async (context, next) => {
    await context.var.business.tiers.assertCanAddUser(
      context.get('session').tenant.id
    )
    await next()
  })
}

export function meterUsage(kind: TierUsageKind) {
  return createMiddleware<AppEnv>(async (context, next) => {
    const tenantId = context.get('session').tenant.id
    const tiers = context.var.business.tiers

    await tiers.assertCanUse(tenantId, kind)
    await next()

    if (context.res.ok) {
      await tiers.recordUse(tenantId, kind)
    }
  })
}
