import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import type { Currency } from './currencies.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

export const limitTypes = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export const limitTypeSchema = z.enum(limitTypes, { error: 'Pick a period.' })

export type LimitType = (typeof limitTypes)[number]

export const amountSchema = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,2})?$/, 'Enter an amount like 12.34.')

export const createLimitSchema = z.object({
  categoryId: z
    .number({ error: 'Pick a category.' })
    .int()
    .positive('Pick a category.'),
  amount: amountSchema,
  type: limitTypeSchema,
})

export const updateLimitSchema = createLimitSchema.extend({
  id: z.number().int().positive(),
})

export const limitFilterSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  type: limitTypeSchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

export const searchLimitsSchema = fetchArgsSchema.extend({
  filter: limitFilterSchema.prefault({}),
})

export const exportLimitsSchema = searchLimitsSchema.extend(csvLocaleField)

export type CreateLimitBody = z.infer<typeof createLimitSchema>
export type UpdateLimitBody = z.infer<typeof updateLimitSchema>
export type SearchLimitsArgs = z.infer<typeof searchLimitsSchema>
export type ExportLimitsArgs = z.infer<typeof exportLimitsSchema>

export type LimitUsage = {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
  spent: string
  excludedCount: number
}

export type Limit = {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
}
