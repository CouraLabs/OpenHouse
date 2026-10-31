import { z } from "zod"
import {
  startPages,
  type StartPage,
  type UserPreferences,
} from "@workspace/domain"

export { startPages, type StartPage, type UserPreferences }

export const startPageSchema = z.enum(startPages, {
  error: "Pick a page.",
})

export const updatePreferencesSchema = z.object({
  startPage: startPageSchema,
})

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesSchema>
