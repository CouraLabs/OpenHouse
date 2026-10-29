import { BadRequestError } from '../errors.js'
import type { SplitInput } from '@workspace/poco'

/**
 * Rejects (400) a payer or a split that names someone outside the given
 * members. Pure of any lookup: the caller passes the ids it allows.
 */
export function assertMembers(
  allowed: readonly number[],
  payerUserId: number | null | undefined,
  split: SplitInput | null | undefined
): void {
  const ids = new Set(allowed)

  if (payerUserId != null && !ids.has(payerUserId)) {
    throw new BadRequestError('The payer is not a member of the household.')
  }

  for (const entry of split?.entries ?? []) {
    if (!ids.has(entry.userId)) {
      throw new BadRequestError(
        'A split can only name members of the household.'
      )
    }
  }
}
