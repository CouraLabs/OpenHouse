import {
  FREE_TIER,
  isTierLevel,
  TIER_PLANS,
  type TierPlan,
  type TierUsageKind,
} from "@workspace/domain"

export { TIER_PLANS, isTierLevel }

export function tierPlan(level: number): TierPlan {
  return isTierLevel(level) ? TIER_PLANS[level] : TIER_PLANS[FREE_TIER]
}

export function monthlyUsageLimit(
  plan: TierPlan,
  kind: TierUsageKind
): number | null {
  return kind === "export" ? plan.maxExportsPerMonth : plan.maxImportsPerMonth
}

export function transactionWindowStart(
  today: string,
  months: number | null
): string | null {
  if (months === null) {
    return null
  }

  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7)) - 1 - (months - 1)
  const start = new Date(Date.UTC(year, month, 1))

  return start.toISOString().slice(0, 10)
}
