import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import type { Currency } from './currencies.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'
import { amountSchema } from './limits.js'

export const dateOnlySchema = z.iso.date('Enter a date like 2026-01-31.')

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
  linkedAccountId: z
    .number({ error: 'Pick an account.' })
    .int()
    .positive('Pick an account.'),
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
  status: entityStatusSchema.default('ACTIVE'),
})

export const searchGoalsSchema = fetchArgsSchema.extend({
  filter: goalFilterSchema.prefault({}),
})

export const exportGoalsSchema = searchGoalsSchema.extend(csvLocaleField)

export type CreateGoalBody = z.infer<typeof createGoalSchema>
export type UpdateGoalBody = z.infer<typeof updateGoalSchema>
export type SearchGoalsArgs = z.infer<typeof searchGoalsSchema>
export type ExportGoalsArgs = z.infer<typeof exportGoalsSchema>

export type Goal = {
  id: number
  name: string
  linkedAccountId: number
  accountName: string
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
  currency: Currency
  accountCurrency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
}
