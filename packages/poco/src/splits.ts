import { z } from 'zod'

import { formatCents, toCents } from './money.js'

/**
 * Splitting an expense between household members. Pure cents arithmetic
 * shared by the API (which stores the shares) and the web (which previews
 * them): the shares of a split always add up to the amount exactly, and the
 * remainder cents go to the payer.
 */

/**
 * How an expense is shared: `equal` between the listed members,
 * `percentage` (each entry's value is a percent, together 100), or `exact`
 * (each entry's value is an amount, together the transaction's amount).
 */
export const splitModes = ['equal', 'percentage', 'exact'] as const

export const splitModeSchema = z.enum(splitModes, {
  error: 'Equal, percentage, or exact.',
})

export type SplitMode = (typeof splitModes)[number]

/** A split value: a percent or an amount, with up to two decimals. */
const splitValueSchema = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,2})?$/, 'Enter a number like 12.34.')

/** One member of a split. `value` is the percent or the amount; an equal
 * split names members only. */
export const splitEntrySchema = z.object({
  userId: z.number().int().positive(),
  value: splitValueSchema.optional(),
})

/** How a transaction (or a category, or a recurring rule) is shared. */
export const splitInputSchema = z
  .object({
    mode: splitModeSchema,
    entries: z
      .array(splitEntrySchema)
      .min(1, 'Pick who shares the expense.')
      .max(50),
  })
  .superRefine((split, ctx) => {
    const seen = new Set<number>()

    for (const [index, entry] of split.entries.entries()) {
      if (seen.has(entry.userId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', index, 'userId'],
          message: 'Each member appears once.',
        })
      }

      seen.add(entry.userId)

      if (split.mode !== 'equal' && entry.value === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', index, 'value'],
          message:
            split.mode === 'percentage'
              ? 'Enter a percentage.'
              : 'Enter an amount.',
        })
      }
    }
  })

export type SplitEntry = z.infer<typeof splitEntrySchema>
export type SplitInput = z.infer<typeof splitInputSchema>

/** One member's resolved share of a transaction, in money. */
export type SplitShare = {
  userId: number
  share: string
}

/** What resolving a split answers: the shares, or why it does not fit. */
export type SplitResolution =
  { ok: true; shares: SplitShare[] } | { ok: false; message: string }

/** Percent expressed in basis points (hundredths of a percent). */
const FULL_PERCENT_BP = 10_000n

/**
 * Divides `totalCents` between weighted members, `floor(total × weight /
 * Σweights)` each, and hands the remainder cents to the payer — or, when the
 * payer holds no share, to the first member. A member whose share rounds to
 * zero is dropped. The shares always add up to the total.
 */
export function allocateByWeights(
  totalCents: bigint,
  weights: ReadonlyArray<{ userId: number; weight: bigint }>,
  payerUserId: number | null
): SplitShare[] {
  const weightSum = weights.reduce((sum, entry) => sum + entry.weight, 0n)

  if (weights.length === 0 || weightSum <= 0n) {
    throw new Error('A split needs at least one weighted member.')
  }

  const cents = weights.map((entry) => (totalCents * entry.weight) / weightSum)
  const remainder = totalCents - cents.reduce((sum, value) => sum + value, 0n)
  const payerIndex = weights.findIndex((entry) => entry.userId === payerUserId)
  const receiver = payerIndex === -1 ? 0 : payerIndex

  cents[receiver] += remainder

  return weights.flatMap((entry, index) =>
    cents[index] > 0n
      ? [{ userId: entry.userId, share: formatCents(cents[index]) }]
      : []
  )
}

/** Reads a percent string (`"33.33"`) into basis points. */
function toBasisPoints(value: string): bigint {
  return toCents(value)
}

/**
 * Resolves a split of `amount` into money shares. Equal: the remainder
 * cents go to the payer. Percentage: each percent is applied to the cents
 * and the remainder is handled the same way. Exact: the entries are the
 * shares and must add up to the amount. Never throws on user input — a
 * split that does not fit answers the reason.
 */
export function resolveSplit(
  amount: string,
  input: SplitInput,
  payerUserId: number | null
): SplitResolution {
  const total = toCents(amount)

  if (total <= 0n) {
    return { ok: false, message: 'Only a positive amount can be split.' }
  }

  if (input.entries.length === 0) {
    return { ok: false, message: 'Pick who shares the expense.' }
  }

  if (input.mode === 'equal') {
    return {
      ok: true,
      shares: allocateByWeights(
        total,
        input.entries.map((entry) => ({ userId: entry.userId, weight: 1n })),
        payerUserId
      ),
    }
  }

  const values = input.entries.map((entry) => toBasisPoints(entry.value ?? '0'))
  const sum = values.reduce((acc, value) => acc + value, 0n)

  if (input.mode === 'percentage') {
    if (sum !== FULL_PERCENT_BP) {
      return { ok: false, message: 'The percentages must add up to 100.' }
    }

    return {
      ok: true,
      shares: allocateByWeights(
        total,
        input.entries.map((entry, index) => ({
          userId: entry.userId,
          weight: values[index],
        })),
        payerUserId
      ),
    }
  }

  if (sum !== total) {
    return { ok: false, message: 'The amounts must add up to the total.' }
  }

  return {
    ok: true,
    shares: input.entries.flatMap((entry, index) =>
      values[index] > 0n
        ? [{ userId: entry.userId, share: formatCents(values[index]) }]
        : []
    ),
  }
}

/** Sums a split's shares exactly. */
export function sumShares(shares: readonly SplitShare[]): string {
  return formatCents(
    shares.reduce((sum, entry) => sum + toCents(entry.share), 0n)
  )
}

/**
 * Re-divides a split over another amount in the same proportions: the new
 * shares follow the old ones as weights, the remainder cents go to the
 * payer. This is how each installment of a purchase inherits the split of
 * its group — every installment's shares add up to the installment's own
 * amount, which `splitInstallments` already cut with the remainder on
 * installment 1.
 */
export function inheritShares(
  shares: readonly SplitShare[],
  amount: string,
  payerUserId: number | null
): SplitShare[] {
  if (shares.length === 0) {
    return []
  }

  return allocateByWeights(
    toCents(amount),
    shares.map((entry) => ({
      userId: entry.userId,
      weight: toCents(entry.share),
    })),
    payerUserId
  )
}

/**
 * Divides a purchase's group shares over its installments, in order. Each
 * installment's shares are the members' shares of what is still owed (their
 * group share less what earlier installments already took), allocated to the
 * installment's amount, the payer taking the cents. So a member's
 * installments add up to their group share exactly — independent rounding
 * per installment would drift by cents — and each installment's shares add up
 * to its amount. The last installment takes exactly what is left.
 */
export function divideGroupShares(
  groupShares: readonly SplitShare[],
  amounts: readonly string[],
  payerUserId: number | null
): SplitShare[][] {
  if (groupShares.length === 0) {
    return amounts.map(() => [])
  }

  const owed = new Map(
    groupShares.map((entry) => [entry.userId, toCents(entry.share)])
  )

  return amounts.map((amount) => {
    // A member who owes nothing more takes no cents, payer included.
    const weights = [...owed]
      .filter(([, weight]) => weight > 0n)
      .map(([userId, weight]) => ({ userId, weight }))
    const shares = allocateByWeights(toCents(amount), weights, payerUserId)

    for (const entry of shares) {
      owed.set(
        entry.userId,
        (owed.get(entry.userId) ?? 0n) - toCents(entry.share)
      )
    }

    return shares
  })
}

/**
 * The shares of an expense nobody split under the household-wide setting:
 * equal between the active members, the remainder cents to the payer.
 */
export function householdShares(
  amount: string,
  memberIds: readonly number[],
  payerUserId: number | null
): SplitShare[] {
  if (memberIds.length === 0) {
    return []
  }

  return allocateByWeights(
    toCents(amount),
    memberIds.map((userId) => ({ userId, weight: 1n })),
    payerUserId
  )
}

/** Whether shares add up to the amount exactly, in cents. */
export function sharesMatchAmount(
  shares: readonly SplitShare[],
  amount: string
): boolean {
  return toCents(sumShares(shares)) === toCents(amount)
}

/**
 * Reads a stored split (the JSON of a category's or a recurring rule's
 * default) back into a `SplitInput`, or nothing when it is absent or no
 * longer valid.
 */
export function parseSplit(value: unknown): SplitInput | null {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = splitInputSchema.safeParse(value)

  return parsed.success ? parsed.data : null
}
