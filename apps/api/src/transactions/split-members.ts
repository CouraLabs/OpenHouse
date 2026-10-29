import type { SplitInput } from '@workspace/poco'

import { BadRequestError } from '../common/errors.js'

/**
 * Rejects (400) a payer or a split that names someone outside the given
 * members. Pure of any lookup: the caller passes the ids it allows.
 *
 * The transactions feature keeps its own copy of this rule — throwing the
 * domain error the Hono error handler maps to 400 — while
 * `common/household/split-members.ts` still throws the Nest exception for
 * the features not yet ported. When that helper moves to the domain errors,
 * this file folds back into it.
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
