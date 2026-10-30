import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountSecurity, RecoveryCodes } from '@workspace/poco'

import { api } from './api.js'

const ACCOUNT_SECURITY_KEY = ['account-security'] as const

export function useAccountSecurity() {
  return useQuery({
    queryKey: ACCOUNT_SECURITY_KEY,
    queryFn: ({ signal }) => api<AccountSecurity>('/auth/security', { signal }),
    staleTime: 5 * 60_000,
  })
}

export function useGenerateRecoveryCodes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      api<RecoveryCodes>('/auth/recovery-codes', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_SECURITY_KEY })
    },
  })
}

export function useAcknowledgeServerNotices() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      api<void>('/auth/security/notices/seen', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_SECURITY_KEY })
    },
  })
}
