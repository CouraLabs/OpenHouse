import type { AuditAction, DbOrTx } from '@workspace/db'

/** One line of the audit log. */
export interface AuditEntry {
  tenantId: number
  /** The user who acted, or `null` for the system (the deletion cron). */
  actorId: number | null
  action: AuditAction
  /** What it was about: ids and labels, never personal data. */
  details?: Record<string, unknown>
}

/**
 * The port features record sensitive actions through. An abstract class is
 * the injection token: callers depend on this, and the `audit/` feature
 * implements it and provides it under the abstract token.
 */
export abstract class AuditRecorder {
  /** Appends a line; pass `tx` to make it part of the action's transaction. */
  abstract record(entry: AuditEntry, tx?: DbOrTx): Promise<void>
}
