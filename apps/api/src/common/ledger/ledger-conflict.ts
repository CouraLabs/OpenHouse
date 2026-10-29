/** Raised when a ledger write's guard matched no rows — the account is
 * gone or no longer ACTIVE, or the row changed under the writer (the
 * optimistic `update_dt` guard). The error handler answers it 409. */
export class LedgerConflictError extends Error {
  constructor(cause?: unknown) {
    super('Another change to these accounts happened at the same time. Try again.')
    if (cause !== undefined && cause !== null) {
      this.cause = cause
    }
    this.name = 'LedgerConflictError'
  }
}
