import { z } from "zod"
import {
  limitTypes,
  type Limit,
  type LimitFilter,
  type LimitType,
  type LimitUsage,
  type MoneyTone,
  type SearchLimitsArgs,
} from "@workspace/domain"
import { csvLocaleField } from "./csv-export.js"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"

export {
  limitTypes,
  type Limit,
  type LimitFilter,
  type LimitType,
  type LimitUsage,
  type MoneyTone,
  type SearchLimitsArgs,
}

export const limitTypeSchema = z.enum(limitTypes, { error: "Pick a period." })

export const amountSchema = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,2})?$/, "Enter an amount like 12.34.")

export const positiveAmountSchema = amountSchema.refine(
  (value) => Number(value) > 0,
  "Enter an amount greater than zero."
)

export const createLimitSchema = z.object({
  categoryId: z
    .number({ error: "Pick a category." })
    .int()
    .positive("Pick a category."),
  amount: positiveAmountSchema,
  type: limitTypeSchema,
})

export const updateLimitSchema = createLimitSchema.extend({
  id: z.number().int().positive(),
})

export const limitFilterSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  type: limitTypeSchema.optional(),
  status: entityStatusSchema.default("ACTIVE"),
})

export const searchLimitsSchema = fetchArgsSchema.extend({
  filter: limitFilterSchema.prefault({}),
})

export const exportLimitsSchema = searchLimitsSchema.extend(csvLocaleField)

export type CreateLimitBody = z.infer<typeof createLimitSchema>
export type UpdateLimitBody = z.infer<typeof updateLimitSchema>
export type ExportLimitsArgs = z.infer<typeof exportLimitsSchema>
