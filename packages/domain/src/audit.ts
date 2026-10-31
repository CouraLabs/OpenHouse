export const auditActions = [
  "csv.export",
  "tenant.export",
  "member.export",
  "member.anonymize",
  "tenant.deletion_scheduled",
  "tenant.deletion_canceled",
  "tenant.deleted",
] as const

export type AuditAction = (typeof auditActions)[number]
