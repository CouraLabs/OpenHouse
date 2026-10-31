import { TENANT_DELETION_GRACE_DAYS } from "@workspace/domain"

export function tenantNameMatches(typed: string, tenantName: string): boolean {
  return typed.trim() === tenantName.trim()
}

export function deletionDateFrom(today: string): string {
  const [year, month, day] = today.split("-").map(Number)

  return new Date(Date.UTC(year, month - 1, day + TENANT_DELETION_GRACE_DAYS))
    .toISOString()
    .slice(0, 10)
}

export function isDeletionDue(deletionDate: string, today: string): boolean {
  return today >= deletionDate
}
