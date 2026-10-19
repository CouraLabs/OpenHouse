import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateInviteCodeBody, InviteCode } from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every invite-code query and mutation lives under. */
const INVITE_CODES_KEY = ['invite-codes'] as const

/** The codes the tenant issued, newest first — owner only. */
export function useInviteCodes() {
  return useQuery({
    queryKey: INVITE_CODES_KEY,
    queryFn: ({ signal }) =>
      api<InviteCode[]>('/tenants/invite-codes', { signal }),
  })
}

/** Generates a new invite code. */
export function useCreateInviteCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateInviteCodeBody) =>
      api<InviteCode>('/tenants/invite-codes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVITE_CODES_KEY })
    },
  })
}

/** Revokes an open invite code: it expires now. */
export function useRevokeInviteCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/tenants/invite-codes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVITE_CODES_KEY })
    },
  })
}

/** Whether a code can still be redeemed: unused and not yet expired. */
export function isPendingInvite(code: InviteCode, now: Date): boolean {
  return (
    code.usedAt === null &&
    (code.expiresAt === null || new Date(code.expiresAt) > now)
  )
}

/** The link a new user opens to sign up with a code already filled in. */
export function inviteLinkFor(code: string): string {
  return `${window.location.origin}/sign-up?code=${encodeURIComponent(code)}`
}
