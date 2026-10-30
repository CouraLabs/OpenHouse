export class LedgerConflictError extends Error {
  constructor(cause?: unknown) {
    super('Another change to these accounts happened at the same time. Try again.')
    if (cause !== undefined && cause !== null) {
      this.cause = cause
    }
    this.name = 'LedgerConflictError'
  }
}
