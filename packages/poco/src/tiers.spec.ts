import { describe, expect, it } from 'vitest'

import {
  monthlyUsageLimit,
  TIER_PLANS,
  tierPlan,
  transactionWindowStart,
} from './tiers.js'

describe('tier plans', () => {
  it('gives Plus five times Free and unlimited transactions', () => {
    expect(TIER_PLANS[1].maxItemsPerResource).toBe(
      (TIER_PLANS[0].maxItemsPerResource as number) * 5
    )
    expect(monthlyUsageLimit(TIER_PLANS[1], 'export')).toBe(5)
    expect(TIER_PLANS[1].transactionMonths).toBeNull()
  })

  it('adds messaging and limited AI on Pro, the assistant on Max', () => {
    expect(TIER_PLANS[2]).toMatchObject({
      messagingIntegration: true,
      ai: 'limited',
      householdAssistant: false,
    })
    expect(TIER_PLANS[3].householdAssistant).toBe(true)
  })

  it('leaves the developer tier unlimited', () => {
    expect(TIER_PLANS[-1]).toMatchObject({
      maxUsers: null,
      maxItemsPerResource: null,
      transactionMonths: null,
    })
  })

  it('allows several signed-in devices on Developer, Pro and Max only', () => {
    expect(
      [-1, 0, 1, 2, 3].map((level) => tierPlan(level).multipleSessions)
    ).toEqual([true, false, false, true, true])
  })

  it('falls back to Free for an unknown level', () => {
    expect(tierPlan(42).name).toBe('Free')
  })
})

describe('transactionWindowStart', () => {
  it('opens the window on the first day two months back', () => {
    expect(transactionWindowStart('2026-10-29', 3)).toBe('2026-08-01')
  })

  it('crosses a year boundary', () => {
    expect(transactionWindowStart('2026-02-10', 3)).toBe('2025-12-01')
  })

  it('has no window when transactions are unlimited', () => {
    expect(transactionWindowStart('2026-10-29', null)).toBeNull()
  })
})
