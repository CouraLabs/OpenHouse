import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TenantDeletion } from '@workspace/poco'

import { api } from '@/lib/api.js'
import { SESSION_QUERY_KEY } from '@/lib/query.js'

/** Schedules the tenant's deletion by its typed name; the session carries
 * the scheduled day afterwards. */
export function useScheduleTenantDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantName: string) =>
      api<TenantDeletion>('/tenant-deletion', {
        method: 'POST',
        body: JSON.stringify({ tenantName }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}

/** Cancels a scheduled deletion. */
export function useCancelTenantDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<void>('/tenant-deletion', { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}
