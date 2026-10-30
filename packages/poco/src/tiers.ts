export const tierLevels = [-1, 0, 1, 2, 3] as const

export type TierLevel = (typeof tierLevels)[number]

export const DEVELOPER_TIER: TierLevel = -1

export const FREE_TIER: TierLevel = 0

export const tierResources = [
  'accounts',
  'categories',
  'receivers',
  'transactionLinkers',
  'limits',
  'goals',
  'recurringTransactions',
] as const

export type TierResource = (typeof tierResources)[number]

export const tierUsageKinds = ['export', 'import'] as const

export type TierUsageKind = (typeof tierUsageKinds)[number]

export type AiAccess = 'none' | 'limited' | 'full'

export interface TierPlan {
  level: TierLevel
  name: string
  currency: 'BRL'
  monthlyPrice: string
  extraUserPrice: string | null
  maxUsers: number | null
  maxItemsPerResource: number | null
  maxExportsPerMonth: number | null
  maxImportsPerMonth: number | null
  transactionMonths: number | null
  messagingIntegration: boolean
  ai: AiAccess
  householdAssistant: boolean
  multipleSessions: boolean
}

const FREE_ITEMS = 2

const FREE_MONTHLY_USES = 1

const PLUS_MULTIPLIER = 5

export const TIER_PLANS: Record<TierLevel, TierPlan> = {
  [-1]: {
    level: -1,
    name: 'Developer',
    currency: 'BRL',
    monthlyPrice: '0.00',
    extraUserPrice: null,
    maxUsers: null,
    maxItemsPerResource: null,
    maxExportsPerMonth: null,
    maxImportsPerMonth: null,
    transactionMonths: null,
    messagingIntegration: true,
    ai: 'full',
    householdAssistant: true,
    multipleSessions: true,
  },
  0: {
    level: 0,
    name: 'Free',
    currency: 'BRL',
    monthlyPrice: '0.00',
    extraUserPrice: null,
    maxUsers: 1,
    maxItemsPerResource: FREE_ITEMS,
    maxExportsPerMonth: FREE_MONTHLY_USES,
    maxImportsPerMonth: FREE_MONTHLY_USES,
    transactionMonths: 3,
    messagingIntegration: false,
    ai: 'none',
    householdAssistant: false,
    multipleSessions: false,
  },
  1: {
    level: 1,
    name: 'Plus',
    currency: 'BRL',
    monthlyPrice: '15.00',
    extraUserPrice: '2.00',
    maxUsers: null,
    maxItemsPerResource: FREE_ITEMS * PLUS_MULTIPLIER,
    maxExportsPerMonth: FREE_MONTHLY_USES * PLUS_MULTIPLIER,
    maxImportsPerMonth: FREE_MONTHLY_USES * PLUS_MULTIPLIER,
    transactionMonths: null,
    messagingIntegration: false,
    ai: 'none',
    householdAssistant: false,
    multipleSessions: false,
  },
  2: {
    level: 2,
    name: 'Pro',
    currency: 'BRL',
    monthlyPrice: '30.00',
    extraUserPrice: '2.00',
    maxUsers: null,
    maxItemsPerResource: FREE_ITEMS * PLUS_MULTIPLIER,
    maxExportsPerMonth: FREE_MONTHLY_USES * PLUS_MULTIPLIER,
    maxImportsPerMonth: FREE_MONTHLY_USES * PLUS_MULTIPLIER,
    transactionMonths: null,
    messagingIntegration: true,
    ai: 'limited',
    householdAssistant: false,
    multipleSessions: true,
  },
  3: {
    level: 3,
    name: 'Max',
    currency: 'BRL',
    monthlyPrice: '40.00',
    extraUserPrice: '2.00',
    maxUsers: null,
    maxItemsPerResource: FREE_ITEMS * PLUS_MULTIPLIER,
    maxExportsPerMonth: FREE_MONTHLY_USES * PLUS_MULTIPLIER,
    maxImportsPerMonth: FREE_MONTHLY_USES * PLUS_MULTIPLIER,
    transactionMonths: null,
    messagingIntegration: true,
    ai: 'limited',
    householdAssistant: true,
    multipleSessions: true,
  },
}

export function isTierLevel(value: number): value is TierLevel {
  return (tierLevels as readonly number[]).includes(value)
}

export function tierPlan(level: number): TierPlan {
  return isTierLevel(level) ? TIER_PLANS[level] : TIER_PLANS[FREE_TIER]
}

export function monthlyUsageLimit(
  plan: TierPlan,
  kind: TierUsageKind
): number | null {
  return kind === 'export' ? plan.maxExportsPerMonth : plan.maxImportsPerMonth
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

export const TIER_LIMIT = 'tier_limit'

export type TierLimitKind =
  'users' | 'items' | 'export' | 'import' | 'transaction_window'

export interface TierLimitError {
  message: string
  error: 'Forbidden'
  statusCode: 403
  code: typeof TIER_LIMIT
  limit: TierLimitKind
  tier: TierLevel
}

export interface TierStatus {
  plan: TierPlan
  usage: {
    users: number
    items: Record<TierResource, number>
    exportsThisMonth: number
    importsThisMonth: number
  }
  transactionWindowStart: string | null
}
