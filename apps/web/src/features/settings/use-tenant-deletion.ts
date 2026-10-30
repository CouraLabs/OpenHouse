import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TenantDeletion } from '@workspace/poco'

import { api } from '@/lib/api.js'
import { SESSION_QUERY_KEY } from '@/lib/query.js'

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

export function useCancelTenantDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<void>('/tenant-deletion', { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}
