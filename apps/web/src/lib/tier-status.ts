import { useQuery } from '@tanstack/react-query'
import type { TierStatus } from '@workspace/poco'
import { api } from './api.js'

export const TIER_STATUS_KEY = ['tier-status'] as const

export function useTierStatus() {
  return useQuery<TierStatus>({
    queryKey: TIER_STATUS_KEY,
    queryFn: ({ signal }) => api<TierStatus>('/tiers/current', { signal }),
  })
}
