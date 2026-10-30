import type { AuditAction } from '@workspace/db'

import type { LedgerStatement } from '../ledger/ledger-batch.js'

export interface AuditEntry {
  tenantId: number
  actorId: number | null
  action: AuditAction
  details?: Record<string, unknown>
}

export abstract class AuditRecorder {
  abstract statement(entry: AuditEntry): LedgerStatement

  abstract record(entry: AuditEntry): Promise<void>
}
