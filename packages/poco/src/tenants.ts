import { z } from 'zod'

/**
 * The tenant routes' contract: invite codes and the tenant's users. The
 * session of the caller names the tenant — a body never does.
 */

/** The body creating a code accepts: an optional lifetime in days. */
export const createInviteCodeSchema = z.object({
  /** How long the code works, in days. Nothing means it never expires. */
  expiresInDays: z.number().int().positive().max(365).optional(),
})

export type CreateInviteCodeBody = z.infer<typeof createInviteCodeSchema>

/** What the invite-code routes return. */
export type InviteCode = {
  id: number
  code: string
  /** When the code was redeemed, or nothing while it is still open. */
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

/** A user of the tenant, as the Users section lists it — secrets never. */
export type TenantUser = {
  id: number
  name: string
  email: string
  role: 'owner' | 'user'
  /** False once an owner removed the user; their history stays. */
  isActive: boolean
  createdAt: string
}
