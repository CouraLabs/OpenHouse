import { z } from "zod"
import type { Goal, GoalFilter, SearchGoalsArgs } from "@workspace/domain"
import { csvLocaleField } from "./csv-export.js"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"
import { amountSchema } from "./limits.js"

export type { Goal, GoalFilter, SearchGoalsArgs }

export const dateOnlySchema = z.iso.date("Enter a date like 2026-01-31.")

export const createGoalSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(255),
  linkedAccountId: z
    .number({ error: "Pick an account." })
    .int()
    .positive("Pick an account."),
  balance: amountSchema,
  balanceDt: dateOnlySchema,
  targetBalance: amountSchema,
  targetDt: dateOnlySchema.nullish(),
})

export const updateGoalSchema = createGoalSchema.extend({
  id: z.number().int().positive(),
})

export const goalFilterSchema = z.object({
  linkedAccountId: z.number().int().positive().optional(),
  status: entityStatusSchema.default("ACTIVE"),
})

export const searchGoalsSchema = fetchArgsSchema.extend({
  filter: goalFilterSchema.prefault({}),
})

export const exportGoalsSchema = searchGoalsSchema.extend(csvLocaleField)

export type CreateGoalBody = z.infer<typeof createGoalSchema>
export type UpdateGoalBody = z.infer<typeof updateGoalSchema>
export type ExportGoalsArgs = z.infer<typeof exportGoalsSchema>
