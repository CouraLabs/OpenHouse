import { useQuery } from '@tanstack/react-query'
import { DEFAULT_UPCOMING_DAYS, type UpcomingResponse } from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key the upcoming panel lives under. */
export const UPCOMING_KEY = ['upcoming'] as const

/** What is coming due in the next `days` days, with the projected balances. */
export function useUpcoming(days: number = DEFAULT_UPCOMING_DAYS) {
  return useQuery({
    queryKey: [...UPCOMING_KEY, days],
    queryFn: ({ signal }) =>
      api<UpcomingResponse>(`/upcoming?days=${days}`, { signal }),
  })
}
