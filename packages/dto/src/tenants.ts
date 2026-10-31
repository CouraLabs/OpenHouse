import { z } from "zod"
import {
  ANONYMIZED_USER_NAME,
  type InviteCode,
  type TenantUser,
} from "@workspace/domain"
import { turnstileTokenSchema } from "./auth.js"

export { ANONYMIZED_USER_NAME, type InviteCode, type TenantUser }

export const createInviteCodeSchema = z.object({
  expiresInDays: z.number().int().positive().max(365).optional(),
  turnstileToken: turnstileTokenSchema.optional(),
})

export type CreateInviteCodeBody = z.infer<typeof createInviteCodeSchema>
