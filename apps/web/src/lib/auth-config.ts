import { useQuery } from '@tanstack/react-query'
import type { AuthConfig } from '@workspace/poco'
import { api } from './api.js'

export function useAuthConfig() {
  return useQuery<AuthConfig>({
    queryKey: ['auth-config'],
    queryFn: ({ signal }) => api<AuthConfig>('/auth/config', { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  })
}
