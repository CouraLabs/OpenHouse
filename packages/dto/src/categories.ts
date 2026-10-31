import { z } from "zod"
import type {
  Category,
  CategoryFilter,
  CategoryRef,
  CategorySuggestion,
  SearchCategoriesArgs,
} from "@workspace/domain"
import {
  CARD_PAYMENT_CATEGORY,
  SETTLEMENT_CATEGORY,
  TRANSFER_CATEGORY,
} from "@workspace/domain"
import { csvLocaleField } from "./csv-export.js"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"
import { splitInputSchema } from "./splits.js"

export type {
  Category,
  CategoryFilter,
  CategoryRef,
  CategorySuggestion,
  SearchCategoriesArgs,
}

export const SYSTEM_CATEGORY_NAMES: readonly string[] = [
  CARD_PAYMENT_CATEGORY.name,
  SETTLEMENT_CATEGORY.name,
  TRANSFER_CATEGORY.name,
]

export const suggestCategorySchema = z.object({
  description: z.string(),
})

export type SuggestCategoryBody = z.infer<typeof suggestCategorySchema>

export const categoryColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, "Use a hex color like #1D4ED8.")

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  color: categoryColorSchema,
  defaultSplit: splitInputSchema.nullish(),
})

export const updateCategorySchema = createCategorySchema.extend({
  id: z.number().int().positive(),
})

export const categoryFilterSchema = z.object({
  name: z.string().max(255).optional(),
  status: entityStatusSchema.default("ACTIVE"),
})

export const searchCategoriesSchema = fetchArgsSchema.extend({
  filter: categoryFilterSchema.prefault({}),
})

export const exportCategoriesSchema =
  searchCategoriesSchema.extend(csvLocaleField)

export type CreateCategoryBody = z.infer<typeof createCategorySchema>
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>
export type ExportCategoriesArgs = z.infer<typeof exportCategoriesSchema>
