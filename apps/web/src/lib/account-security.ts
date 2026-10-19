import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountSecurity, RecoveryCodes } from '@workspace/poco'

import { api } from './api.js'

/** The key the signed-in user's account security lives under. */
const ACCOUNT_SECURITY_KEY = ['account-security'] as const

/**
 * The signed-in user's recovery codes left and unacknowledged server-issued
 * resets — what the shell's prompts and the Security section read.
 */
export function useAccountSecurity() {
  return useQuery({
    queryKey: ACCOUNT_SECURITY_KEY,
    queryFn: ({ signal }) => api<AccountSecurity>('/auth/security', { signal }),
    staleTime: 5 * 60_000,
  })
}

/** Generates a fresh set of the owner's recovery codes; the previous set
 * stops working. The codes are answered once. */
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

/** Acknowledges the notices of resets issued from the server. */
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
