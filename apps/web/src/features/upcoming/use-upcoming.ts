import { useQuery } from '@tanstack/react-query'
import { DEFAULT_UPCOMING_DAYS, type UpcomingResponse } from '@workspace/poco'

import { api } from '@/lib/api.js'

export const UPCOMING_KEY = ['upcoming'] as const

export function useUpcoming(days: number = DEFAULT_UPCOMING_DAYS) {
  return useQuery({
    queryKey: [...UPCOMING_KEY, days],
    queryFn: ({ signal }) =>
      api<UpcomingResponse>(`/upcoming?days=${days}`, { signal }),
  })
}
