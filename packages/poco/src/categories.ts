import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import { splitInputSchema, type SplitInput } from './splits.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

export const categoryColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, 'Use a hex color like #1D4ED8.')

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required.').max(255),
  color: categoryColorSchema,
  defaultSplit: splitInputSchema.nullish(),
})

export const updateCategorySchema = createCategorySchema.extend({
  id: z.number().int().positive(),
})

export const categoryFilterSchema = z.object({
  name: z.string().max(255).optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

export const searchCategoriesSchema = fetchArgsSchema.extend({
  filter: categoryFilterSchema.prefault({}),
})

export const exportCategoriesSchema =
  searchCategoriesSchema.extend(csvLocaleField)

export type CreateCategoryBody = z.infer<typeof createCategorySchema>
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>
export type SearchCategoriesArgs = z.infer<typeof searchCategoriesSchema>
export type ExportCategoriesArgs = z.infer<typeof exportCategoriesSchema>

export type CategoryRef = {
  id: number
  name: string
  defaultSplit?: SplitInput | null
}

export type Category = {
  id: number
  name: string
  color: string
  defaultSplit: SplitInput | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
