import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TenantUser } from '@workspace/dto'

import { api } from '@/lib/api.js'

const TENANT_USERS_KEY = ['tenant-users'] as const

export function useTenantUsers() {
  return useQuery({
    queryKey: TENANT_USERS_KEY,
    queryFn: ({ signal }) => api<TenantUser[]>('/tenants/users', { signal }),
  })
}

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

export function useAnonymizeUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<TenantUser>(`/tenants/users/${id}/anonymize`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEY })
    },
  })
}
