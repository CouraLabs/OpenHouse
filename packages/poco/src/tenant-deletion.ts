import { z } from 'zod'

/**
 * The tenant deletion contract. The owner schedules the deletion by typing
 * the tenant's name; the tenant and everything it owns are hard-deleted
 * once the grace period has passed — the one sanctioned exception to soft
 * delete — unless the owner cancels first.
 */

/** How many days pass between scheduling the deletion and carrying it out. */
export const TENANT_DELETION_GRACE_DAYS = 30

/** The body `POST tenant-deletion` accepts: the typed tenant name. */
export const scheduleTenantDeletionSchema = z.object({
  tenantName: z.string().trim().min(1, 'Type the tenant name to confirm.'),
})

export type ScheduleTenantDeletionBody = z.infer<
  typeof scheduleTenantDeletionSchema
>

/** What scheduling answers with: the day the data will be deleted. */
export type TenantDeletion = {
  /** A `YYYY-MM-DD` day in the tenant's calendar. */
  deletionDate: string
}

/** Whether the name the owner typed is the tenant's. Exact, apart from the
 * surrounding whitespace — a near miss must not delete a household. */
export function tenantNameMatches(typed: string, tenantName: string): boolean {
  return typed.trim() === tenantName.trim()
}

/** The day a deletion scheduled on `today` (a `YYYY-MM-DD` day) is carried
 * out: the grace period later. Pure calendar arithmetic on a UTC midnight,
 * so no time zone or DST boundary can move it. */
export function deletionDateFrom(today: string): string {
  const [year, month, day] = today.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day + TENANT_DELETION_GRACE_DAYS))
    .toISOString()
    .slice(0, 10)
}

/** Whether a deletion scheduled for `deletionDate` is due on `today`. */
export function isDeletionDue(deletionDate: string, today: string): boolean {
  return today >= deletionDate
}
