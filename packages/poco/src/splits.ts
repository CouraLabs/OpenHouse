import { z } from 'zod'

import { formatCents, toCents } from './money.js'

export const splitModes = ['equal', 'percentage', 'exact'] as const

export const splitModeSchema = z.enum(splitModes, {
  error: 'Equal, percentage, or exact.',
})

export type SplitMode = (typeof splitModes)[number]

const splitValueSchema = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,2})?$/, 'Enter a number like 12.34.')

export const splitEntrySchema = z.object({
  userId: z.number().int().positive(),
  value: splitValueSchema.optional(),
})

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

export type SplitShare = {
  userId: number
  share: string
}

export type SplitResolution =
  { ok: true; shares: SplitShare[] } | { ok: false; message: string }

const FULL_PERCENT_BP = 10_000n

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

function toBasisPoints(value: string): bigint {
  return toCents(value)
}

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

export function sumShares(shares: readonly SplitShare[]): string {
  return formatCents(
    shares.reduce((sum, entry) => sum + toCents(entry.share), 0n)
  )
}

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

export function sharesMatchAmount(
  shares: readonly SplitShare[],
  amount: string
): boolean {
  return toCents(sumShares(shares)) === toCents(amount)
}

export function parseSplit(value: unknown): SplitInput | null {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = splitInputSchema.safeParse(value)

  return parsed.success ? parsed.data : null
}
