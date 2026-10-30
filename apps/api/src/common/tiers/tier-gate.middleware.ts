import { createMiddleware } from 'hono/factory'
import type { TierResource, TierUsageKind } from '@workspace/poco'

import type { AppEnv } from '../context.js'
import type { TierGate } from './tier-gate.js'

export function requireCapacity(gate: TierGate, resource: TierResource) {
  return createMiddleware<AppEnv>(async (context, next) => {
    await gate.assertCanAdd(context.get('session').tenant.id, resource)
    await next()
  })
}

export function requireUserSeat(gate: TierGate) {
  return createMiddleware<AppEnv>(async (context, next) => {
    await gate.assertCanAddUser(context.get('session').tenant.id)
    await next()
  })
}

export function meterUsage(gate: TierGate, kind: TierUsageKind) {
  return createMiddleware<AppEnv>(async (context, next) => {
    const tenantId = context.get('session').tenant.id

    await gate.assertCanUse(tenantId, kind)
    await next()

    if (context.res.ok) {
      await gate.recordUse(tenantId, kind)
    }
  })
}
