import type { TierRepository } from '@workspace/db'
import { TIER_PLANS } from '@workspace/domain'
import {
  TIER_LIMIT,
  tierResources,
  type TierLimitError,
  type TierLimitKind,
  type TierPlan,
  type TierResource,
  type TierStatus,
  type TierUsageKind,
} from '@workspace/dto'
import { ForbiddenError } from '../errors.js'
import type { Clock } from '../ports/clock.js'
import { TierGate } from '../ports/tier-gate.js'
import { todayIn } from '../settings/settings.js'
import {
  monthlyUsageLimit,
  tierPlan,
  transactionWindowStart,
} from './tiers.js'

const PUBLIC_PLANS: TierPlan[] = [
  TIER_PLANS[0],
  TIER_PLANS[1],
  TIER_PLANS[2],
  TIER_PLANS[3],
]

const RESOURCE_LABELS: Record<TierResource, string> = {
  accounts: 'accounts',
  categories: 'categories',
  receivers: 'receivers',
  transactionLinkers: 'transaction linkers',
  limits: 'limits',
  goals: 'goals',
  recurringTransactions: 'recurring transactions',
}

export class TierGateService extends TierGate {
  constructor(
    private readonly repository: TierRepository,
    private readonly clock: Clock
  ) {
    super()
  }

  async assertCanAdd(tenantId: number, resource: TierResource): Promise<void> {
    const { plan } = await this.planOf(tenantId)

    if (plan.maxItemsPerResource === null) {
      return
    }

    if (
      (await this.repository.countItems(tenantId, resource)) >=
      plan.maxItemsPerResource
    ) {
      throw limitReached(
        plan,
        'items',
        `The ${plan.name} plan allows ${plan.maxItemsPerResource} ${RESOURCE_LABELS[resource]}. Upgrade your plan to add more.`
      )
    }
  }

  async assertCanAddUser(tenantId: number): Promise<void> {
    const { plan } = await this.planOf(tenantId)

    if (plan.maxUsers === null) {
      return
    }

    if ((await this.repository.countActiveUsers(tenantId)) >= plan.maxUsers) {
      throw limitReached(
        plan,
        'users',
        `The ${plan.name} plan allows ${plan.maxUsers} ${plan.maxUsers === 1 ? 'user' : 'users'}. Upgrade your plan to invite more people.`
      )
    }
  }

  async assertCanUse(tenantId: number, kind: TierUsageKind): Promise<void> {
    const { plan, period } = await this.planOf(tenantId)
    const limit = monthlyUsageLimit(plan, kind)

    if (limit === null) {
      return
    }

    if ((await this.repository.usage(tenantId, kind, period)) >= limit) {
      throw limitReached(
        plan,
        kind,
        `The ${plan.name} plan allows ${limit} ${kind}${limit === 1 ? '' : 's'} a month. Upgrade your plan or wait until next month.`
      )
    }
  }

  async recordUse(tenantId: number, kind: TierUsageKind): Promise<void> {
    const { plan, period } = await this.planOf(tenantId)

    if (monthlyUsageLimit(plan, kind) === null) {
      return
    }

    await this.repository.incrementUsage(tenantId, kind, period)
  }

  async transactionWindowStart(tenantId: number): Promise<string | null> {
    const { plan, today } = await this.planOf(tenantId)

    return transactionWindowStart(today, plan.transactionMonths)
  }

  async status(tenantId: number): Promise<TierStatus> {
    const { plan, period, today } = await this.planOf(tenantId)
    const counts = await Promise.all(
      tierResources.map((resource) =>
        this.repository.countItems(tenantId, resource)
      )
    )

    return {
      plan,
      plans: PUBLIC_PLANS,
      usage: {
        users: await this.repository.countActiveUsers(tenantId),
        items: Object.fromEntries(
          tierResources.map((resource, index) => [resource, counts[index]])
        ) as Record<TierResource, number>,
        exportsThisMonth: await this.repository.usage(
          tenantId,
          'export',
          period
        ),
        importsThisMonth: await this.repository.usage(
          tenantId,
          'import',
          period
        ),
      },
      transactionWindowStart: transactionWindowStart(
        today,
        plan.transactionMonths
      ),
    }
  }

  private async planOf(
    tenantId: number
  ): Promise<{ plan: TierPlan; today: string; period: string }> {
    const tenant = await this.repository.tenantTier(tenantId)
    const today = todayIn(tenant?.timezone ?? 'UTC', this.clock.now())

    return {
      plan: tierPlan(tenant?.tier ?? 0),
      today,
      period: today.slice(0, 7),
    }
  }
}

export function limitReached(
  plan: TierPlan,
  limit: TierLimitKind,
  message: string
): ForbiddenError {
  return new ForbiddenError({
    message,
    error: 'Forbidden',
    statusCode: 403,
    code: TIER_LIMIT,
    limit,
    tier: plan.level,
  } satisfies TierLimitError)
}
