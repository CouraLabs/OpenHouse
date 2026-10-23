import { z } from 'zod'

import { balanceSchema } from './accounts.js'
import type { Currency } from './currencies.js'
import { dateOnlySchema } from './goals.js'
import type { Transaction } from './transactions.js'

/**
 * The reconciliation and balance-history contract: the user reads the
 * balance the bank shows on a day, the API answers what the ledger computes
 * for that day, and the difference is closed by marking rows Checked or by
 * an adjustment transaction. Money is a string end to end.
 */

/** The category an adjustment lands in: fetched, or created the first time a
 * tenant reconciles. Adjustments stay out of income/expense reports. */
export const BALANCE_ADJUSTMENT_CATEGORY = {
  name: 'Balance adjustment',
  color: '#94A3B8',
} as const

/** The name the adjustment transaction carries. */
export const BALANCE_ADJUSTMENT_NAME = 'Balance adjustment'

/** The body of a reconciliation preview: the bank's balance on a day. */
export const reconcilePreviewSchema = z.object({
  date: dateOnlySchema,
  bankBalance: balanceSchema,
})

/** The body that commits a reconciliation. */
export const reconcileSchema = reconcilePreviewSchema.extend({
  /** Mark every Verify row up to the date as Checked. */
  markChecked: z.boolean().prefault(false),
  /** Create the adjustment transaction for the difference. */
  createAdjustment: z.boolean().prefault(false),
})

export type ReconcilePreviewBody = z.infer<typeof reconcilePreviewSchema>
export type ReconcileBody = z.infer<typeof reconcileSchema>

/** What a preview answers: the ledger's balance on the day, the bank's, the
 * difference (`bank − computed`), and the rows still awaiting a check. */
export type ReconcilePreview = {
  accountId: number
  currency: Currency
  date: string
  bankBalance: string
  /** The end-of-day running balance on the date. */
  computedBalance: string
  /** `bankBalance − computedBalance`; zero when the books agree. */
  difference: string
  /** The Verify-status rows up to the date, oldest first (the first page
   * of them; `verifyCount` is how many there are in all). */
  verifyRows: Transaction[]
  verifyCount: number
}

/** What a committed reconciliation answers. */
export type ReconcileResult = {
  /** The account's `reconciledThrough` after the commit. */
  reconciledThrough: string
  /** The account's end-of-day balance on the reconciled date. */
  balance: string
  /** The adjustment transaction created, or nothing. */
  adjustment: Transaction | null
  /** How many Verify rows were marked Checked. */
  checkedCount: number
}

/** The 409 body of an edit to a row on or before the account's
 * `reconciledThrough`, until the caller confirms it. */
export type ReconciledEditConflict = {
  message: string
  reconciledThrough: string
}

/** The most days a balance history spans. */
export const MAX_BALANCE_HISTORY_DAYS = 731

/** The body of a balance-history query: an inclusive range of days. */
export const balanceHistorySchema = z
  .object({
    from: dateOnlySchema,
    to: dateOnlySchema,
  })
  .superRefine((range, ctx) => {
    if (range.from > range.to) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'The end must not be before the start.',
      })
    }
  })

export type BalanceHistoryBody = z.infer<typeof balanceHistorySchema>

/** One day's end-of-day balance. */
export type BalanceHistoryPoint = {
  date: string
  balance: string
}

/** What the history route answers: one point per day of the range. */
export type BalanceHistory = {
  accountId: number
  currency: Currency
  points: BalanceHistoryPoint[]
}

/** One account whose cached balance disagrees with its ledger. */
export type BalanceDrift = {
  accountId: number
  name: string
  /** The cached `accounts.balance`. */
  balance: string
  /** `openingBalance + sum(applied deltas)`. */
  expected: string
  /** `balance − expected`. */
  drift: string
}

/** What the consistency check answers. */
export type BalanceConsistency = {
  checked: number
  drifts: BalanceDrift[]
}
