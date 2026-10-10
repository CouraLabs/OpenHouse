import { z } from 'zod'

/**
 * The invite-code routes' contract: the body creating a code and the code a
 * list returns. The session of the caller names the tenant — a body never
 * does.
 */

/** The body creating a code accepts: an optional lifetime in days. */
export const createInviteCodeSchema = z.object({
  /** How long the code works, in days. Nothing means it never expires. */
  expiresInDays: z.number().int().positive().max(365).optional(),
})

export type CreateInviteCodeBody = z.infer<typeof createInviteCodeSchema>

/** What the invite-code routes return. */
export type InviteCode = {
  code: string
  expiresAt: string | null
  createdAt: string
}
