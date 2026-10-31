import { z } from "zod"
import {
  frequencies,
  type Frequency,
  type NextOccurrencePreview,
  type RecurringTransaction,
  type RecurringTransactionFilter,
  type SearchRecurringTransactionsArgs,
} from "@workspace/domain"
import { csvLocaleField } from "./csv-export.js"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"
import { dateOnlySchema } from "./goals.js"
import { amountSchema } from "./limits.js"
import { splitInputSchema } from "./splits.js"
import { transactionTypeSchema } from "./transactions.js"

export {
  frequencies,
  type Frequency,
  type NextOccurrencePreview,
  type RecurringTransaction,
  type RecurringTransactionFilter,
  type SearchRecurringTransactionsArgs,
}

export const nextOccurrenceSchema = z.object({
  frequency: z.enum(frequencies),
  frequencyDay: z.number().int().nullish(),
  frequencyMonth: z.number().int().nullish(),
  today: dateOnlySchema.optional(),
})

export type NextOccurrenceBody = z.infer<typeof nextOccurrenceSchema>

export const frequencySchema = z.enum(frequencies, {
  error: "Pick a frequency.",
})

export const createRecurringTransactionSchema = z
  .object({
    receiverId: z
      .number({ error: "Pick a receiver." })
      .int()
      .positive("Pick a receiver."),
    categoryId: z
      .number({ error: "Pick a category." })
      .int()
      .positive("Pick a category."),
    linkedAccountId: z
      .number({ error: "Pick an account." })
      .int()
      .positive("Pick an account."),
    amount: amountSchema,
    type: transactionTypeSchema,
    frequency: frequencySchema,
    frequencyDay: z
      .number()
      .int()
      .min(1, "The day must be 1 or more.")
      .max(31, "The day must be 31 or less.")
      .nullish(),
    frequencyMonth: z
      .number()
      .int()
      .min(1, "The month must be 1 or more.")
      .max(12, "The month must be 12 or less.")
      .nullish(),
    paidByUserId: z.number().int().positive().nullish(),
    defaultSplit: splitInputSchema.nullish(),
  })
  .superRefine((rule, ctx) => {
    const { frequency, frequencyDay, frequencyMonth } = rule

    if (frequency === "Daily") {
      if (frequencyDay != null) {
        ctx.addIssue({
          code: "custom",
          path: ["frequencyDay"],
          message: "A Daily rule has no day.",
        })
      }

      if (frequencyMonth != null) {
        ctx.addIssue({
          code: "custom",
          path: ["frequencyMonth"],
          message: "A Daily rule has no month.",
        })
      }

      return
    }

    if (frequency === "Weekly") {
      if (frequencyDay == null) {
        ctx.addIssue({
          code: "custom",
          path: ["frequencyDay"],
          message: "Pick the day of the week.",
        })
      } else if (frequencyDay < 1 || frequencyDay > 7) {
        ctx.addIssue({
          code: "custom",
          path: ["frequencyDay"],
          message: "The day of the week runs 1 to 7.",
        })
      }

      if (frequencyMonth != null) {
        ctx.addIssue({
          code: "custom",
          path: ["frequencyMonth"],
          message: "A Weekly rule has no month.",
        })
      }

      return
    }

    if (frequencyDay == null) {
      ctx.addIssue({
        code: "custom",
        path: ["frequencyDay"],
        message: "Pick the day of the month.",
      })
    }

    if (frequency === "Yearly" && frequencyMonth == null) {
      ctx.addIssue({
        code: "custom",
        path: ["frequencyMonth"],
        message: "Pick the day and the month.",
      })
    }
  })

export const updateRecurringTransactionSchema =
  createRecurringTransactionSchema.extend({
    id: z.number().int().positive(),
  })

export const recurringTransactionFilterSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  linkedAccountId: z.number().int().positive().optional(),
  frequency: frequencySchema.optional(),
  status: entityStatusSchema.default("ACTIVE"),
})

export const searchRecurringTransactionsSchema = fetchArgsSchema.extend({
  filter: recurringTransactionFilterSchema.prefault({}),
})

export const exportRecurringTransactionsSchema =
  searchRecurringTransactionsSchema.extend(csvLocaleField)

export type CreateRecurringTransactionBody = z.infer<
  typeof createRecurringTransactionSchema
>
export type UpdateRecurringTransactionBody = z.infer<
  typeof updateRecurringTransactionSchema
>
export type ExportRecurringTransactionsArgs = z.infer<
  typeof exportRecurringTransactionsSchema
>
