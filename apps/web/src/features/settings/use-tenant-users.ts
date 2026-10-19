import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TenantUser } from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every tenant-user query and mutation lives under. */
const TENANT_USERS_KEY = ['tenant-users'] as const

/** The tenant's users, removed ones included — owner only. */
export function useTenantUsers() {
  return useQuery({
    queryKey: TENANT_USERS_KEY,
    queryFn: ({ signal }) => api<TenantUser[]>('/tenants/users', { signal }),
  })
}

/** Removes a user (`deactivate`) or restores one (`reactivate`). */
export function useSetUserActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api<TenantUser>(
        `/tenants/users/${id}/${active ? 'reactivate' : 'deactivate'}`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEY })
    },
  })
}
