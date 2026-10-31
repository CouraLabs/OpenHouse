export class LedgerConflictError extends Error {
  constructor(cause?: unknown) {
    super('Optimistic concurrency conflict', { cause })
    this.name = 'LedgerConflictError'
  }
}
