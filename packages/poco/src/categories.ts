import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import { splitInputSchema, type SplitInput } from './splits.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

/**
 * The category routes' contract: the bodies the write routes accept, the
 * args the search route accepts, and the rows they answer with. The session
 * of the caller names the tenant — no body or query ever does.
 */

/**
 * A category color is a hex color: `#RRGGBB` or `#RRGGBBAA` — 7 or 9
 * characters, matching the column's 9-character room.
 */
export const categoryColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, 'Use a hex color like #1D4ED8.')

/** The body creating a category accepts. */
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required.').max(255),
  color: categoryColorSchema,
  /** The split new expenses of the category start with ("Rent: 60/40"); for
   * percentage and equal modes it applies to any amount. `null` clears it. */
  defaultSplit: splitInputSchema.nullish(),
})

/** The body updating a category accepts: the same fields, plus which row. */
export const updateCategorySchema = createCategorySchema.extend({
  id: z.number().int().positive(),
})

/** What a category search filters on. Without a status, only ACTIVE rows. */
export const categoryFilterSchema = z.object({
  name: z.string().max(255).optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a category filter. */
export const searchCategoriesSchema = fetchArgsSchema.extend({
  filter: categoryFilterSchema.prefault({}),
})

/** The body `POST categories/export` accepts: the search, plus the CSV locale. */
export const exportCategoriesSchema =
  searchCategoriesSchema.extend(csvLocaleField)

export type CreateCategoryBody = z.infer<typeof createCategorySchema>
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>
export type SearchCategoriesArgs = z.infer<typeof searchCategoriesSchema>
export type ExportCategoriesArgs = z.infer<typeof exportCategoriesSchema>

/** The lightweight shape pickers read — what `GET /categories` returns. */
export type CategoryRef = {
  id: number
  name: string
  /** The split new expenses of the category start with, or nothing. */
  defaultSplit?: SplitInput | null
}

/** What the category routes return: the wire shape, dates as ISO strings. */
export type Category = {
  id: number
  name: string
  color: string
  /** The split new expenses of the category start with, or nothing. */
  defaultSplit: SplitInput | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
