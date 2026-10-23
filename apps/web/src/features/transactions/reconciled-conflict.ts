import type { ReconciledEditConflict } from '@workspace/poco'

import { ApiError } from '@/lib/api.js'

/**
 * The 409 body a change to a reconciled (locked) transaction answers until
 * the call confirms it, or nothing for any other failure. The question is
 * the user's, not an error: the page asks, then retries with
 * `confirmReconciled`.
 */
export function reconciledConflictOf(
  error: unknown
): ReconciledEditConflict | null {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'reconciledThrough' in error.body
  ) {
    return error.body as ReconciledEditConflict
  }

  return null
}
