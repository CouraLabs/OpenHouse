import { z } from "zod"
import {
  accountOwnerships,
  toCents,
  unsplitModes,
  type AccountOwnership,
  type CategorySpending,
  type DebtTransfer,
  type HouseholdBalance,
  type HouseholdMember,
  type HouseholdOverview,
  type HouseholdOverviewArgs,
  type LedgerEntry,
  type MemberBalance,
  type MemberBalanceCheck,
  type MemberSpending,
  type SettleSuggestion,
  type SettlementEntry,
  type UnsplitMode,
} from "@workspace/domain"
import { currencySchema } from "./currencies.js"
import { dateOnlySchema } from "./goals.js"
import { positiveAmountSchema } from "./limits.js"

export {
  accountOwnerships,
  unsplitModes,
  type AccountOwnership,
  type CategorySpending,
  type DebtTransfer,
  type HouseholdBalance,
  type HouseholdMember,
  type HouseholdOverview,
  type HouseholdOverviewArgs,
  type LedgerEntry,
  type MemberBalance,
  type MemberBalanceCheck,
  type MemberSpending,
  type SettleSuggestion,
  type SettlementEntry,
  type UnsplitMode,
}

export const unsplitModeSchema = z.enum(unsplitModes, {
  error: "Personal or household.",
})

export const accountOwnershipSchema = z.enum(accountOwnerships, {
  error: "Personal or shared.",
})

export const householdOverviewSchema = z.object({
  transactionDtFrom: dateOnlySchema.optional(),
  transactionDtTo: dateOnlySchema.optional(),
})

export const settleUpSchema = z
  .object({
    fromUserId: z.number({ error: "Pick who pays." }).int().positive(),
    toUserId: z.number({ error: "Pick who receives." }).int().positive(),
    amount: positiveAmountSchema,
    currency: currencySchema,
    fromAccountId: z
      .number({ error: "Pick the paying account." })
      .int()
      .positive("Pick the paying account."),
    toAccountId: z.number().int().positive().nullish(),
    transactionDt: dateOnlySchema,
    note: z
      .string()
      .max(2000, "Keep the note under 2000 characters.")
      .nullish(),
  })
  .superRefine((body, ctx) => {
    if (body.fromUserId === body.toUserId) {
      ctx.addIssue({
        code: "custom",
        path: ["toUserId"],
        message: "Pick two different members.",
      })
    }

    if (toCents(body.amount) <= 0n) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter an amount above zero.",
      })
    }
  })

export type SettleUpBody = z.infer<typeof settleUpSchema>
