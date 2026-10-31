import type { ReconciledEditConflict } from '@workspace/dto'

import { ApiError } from '@/lib/api.js'

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
