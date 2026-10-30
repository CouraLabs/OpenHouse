import { z } from 'zod'
import { turnstileTokenSchema } from './auth.js'

export const createInviteCodeSchema = z.object({
  expiresInDays: z.number().int().positive().max(365).optional(),
  turnstileToken: turnstileTokenSchema.optional(),
})

export type CreateInviteCodeBody = z.infer<typeof createInviteCodeSchema>

export type InviteCode = {
  id: number
  code: string
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export type TenantUser = {
  id: number
  name: string
  email: string
  role: 'owner' | 'user'
  isActive: boolean
  anonymizedAt: string | null
  createdAt: string
}

export const ANONYMIZED_USER_NAME = 'Former member'
