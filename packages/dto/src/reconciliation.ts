import { z } from "zod"
import {
  MAX_BALANCE_HISTORY_DAYS,
  type BalanceConsistency,
  type BalanceDrift,
  type BalanceHistory,
  type BalanceHistoryPoint,
  type ReconcilePreview,
  type ReconcileResult,
  type ReconciledEditConflict,
} from "@workspace/domain"
import { balanceSchema } from "./accounts.js"
import { dateOnlySchema } from "./goals.js"

export {
  MAX_BALANCE_HISTORY_DAYS,
  type BalanceConsistency,
  type BalanceDrift,
  type BalanceHistory,
  type BalanceHistoryPoint,
  type ReconcilePreview,
  type ReconcileResult,
  type ReconciledEditConflict,
}

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

export const balanceHistorySchema = z
  .object({
    from: dateOnlySchema,
    to: dateOnlySchema,
  })
  .superRefine((range, ctx) => {
    if (range.from > range.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end must not be before the start.",
      })
    }
  })

export type BalanceHistoryBody = z.infer<typeof balanceHistorySchema>
