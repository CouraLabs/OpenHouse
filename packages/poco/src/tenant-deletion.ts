import { z } from 'zod'

export const TENANT_DELETION_GRACE_DAYS = 30

export const scheduleTenantDeletionSchema = z.object({
  tenantName: z.string().trim().min(1, 'Type the tenant name to confirm.'),
})

export type ScheduleTenantDeletionBody = z.infer<
  typeof scheduleTenantDeletionSchema
>

export type TenantDeletion = {
  deletionDate: string
}

export function tenantNameMatches(typed: string, tenantName: string): boolean {
  return typed.trim() === tenantName.trim()
}

export function deletionDateFrom(today: string): string {
  const [year, month, day] = today.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day + TENANT_DELETION_GRACE_DAYS))
    .toISOString()
    .slice(0, 10)
}

export function isDeletionDue(deletionDate: string, today: string): boolean {
  return today >= deletionDate
}
