import type { TierResource, TierUsageKind } from '@workspace/poco'

export abstract class TierGate {
  abstract assertCanAdd(tenantId: number, resource: TierResource): Promise<void>

  abstract assertCanAddUser(tenantId: number): Promise<void>

  abstract assertCanUse(tenantId: number, kind: TierUsageKind): Promise<void>

  abstract recordUse(tenantId: number, kind: TierUsageKind): Promise<void>

  abstract transactionWindowStart(tenantId: number): Promise<string | null>
}
