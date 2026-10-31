import { z } from "zod"
import type { TenantDeletion } from "@workspace/domain"

export type { TenantDeletion }

export const scheduleTenantDeletionSchema = z.object({
  tenantName: z.string().trim().min(1, "Type the tenant name to confirm."),
})

export type ScheduleTenantDeletionBody = z.infer<
  typeof scheduleTenantDeletionSchema
>
