import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateInviteCodeBody, InviteCode } from '@workspace/dto'

import { api } from '@/lib/api.js'
import { appUrl } from '@/lib/app-url.js'

const INVITE_CODES_KEY = ['invite-codes'] as const

export function useInviteCodes() {
  return useQuery({
    queryKey: INVITE_CODES_KEY,
    queryFn: ({ signal }) =>
      api<InviteCode[]>('/tenants/invite-codes', { signal }),
  })
}

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

export function isPendingInvite(code: InviteCode, now: Date): boolean {
  return (
    code.usedAt === null &&
    (code.expiresAt === null || new Date(code.expiresAt) > now)
  )
}

export function inviteLinkFor(code: string): string {
  return appUrl(`/sign-up?code=${encodeURIComponent(code)}`)
}
