import { z } from 'zod'

import { balanceSchema } from './accounts.js'
import type { Currency } from './currencies.js'
import { dateOnlySchema } from './goals.js'
import type { Transaction } from './transactions.js'

export const BALANCE_ADJUSTMENT_CATEGORY = {
  name: 'Balance adjustment',
  color: '#94A3B8',
} as const

export const BALANCE_ADJUSTMENT_NAME = 'Balance adjustment'

export const reconcilePreviewSchema = z.object({
  date: dateOnlySchema,
  bankBalance: balanceSchema,
})

export const reconcileSchema = reconcilePreviewSchema.extend({
  markChecked: z.boolean().prefault(false),
  createAdjustment: z.boolean().prefault(false),
})

export type ReconcilePreviewBody = z.infer<typeof reconcilePreviewSchema>
export type ReconcileBody = z.infer<typeof reconcileSchema>

export type ReconcilePreview = {
  accountId: number
  currency: Currency
  date: string
  bankBalance: string
  computedBalance: string
  difference: string
  verifyRows: Transaction[]
  verifyCount: number
}

export type ReconcileResult = {
  reconciledThrough: string
  balance: string
  adjustment: Transaction | null
  checkedCount: number
}

export type ReconciledEditConflict = {
  message: string
  reconciledThrough: string
}

export const MAX_BALANCE_HISTORY_DAYS = 731

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

export type BalanceHistoryPoint = {
  date: string
  balance: string
}

export type BalanceHistory = {
  accountId: number
  currency: Currency
  points: BalanceHistoryPoint[]
}

export type BalanceDrift = {
  accountId: number
  name: string
  balance: string
  expected: string
  drift: string
}

export type BalanceConsistency = {
  checked: number
  drifts: BalanceDrift[]
}
