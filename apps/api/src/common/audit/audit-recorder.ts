import type { AuditAction } from '@workspace/db'

import type { LedgerStatement } from '../ledger/ledger-batch.js'

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
  /**
   * The line's insert statement, for the caller's batch — the way the line
   * commits with the action it records, in the one batch the action is.
   */
  abstract statement(entry: AuditEntry): LedgerStatement

  /** Appends a line now, as its own batch. */
  abstract record(entry: AuditEntry): Promise<void>
}
