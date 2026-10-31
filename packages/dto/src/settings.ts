import { z } from "zod"
import {
  isSupportedTimeZone,
  type CurrencyChangeConflict,
  type SettingsDefaults,
  type TenantSettings,
} from "@workspace/domain"
import { currencySchema } from "./currencies.js"
import { unsplitModeSchema } from "./household.js"

export type { CurrencyChangeConflict, SettingsDefaults, TenantSettings }

export const timeZoneSchema = z
  .string()
  .refine(isSupportedTimeZone, { error: "Pick a supported time zone." })

export const settingsDefaultsQuerySchema = z.object({
  locale: z.string().optional(),
})

export type SettingsDefaultsQuery = z.infer<typeof settingsDefaultsQuerySchema>

export const updateSettingsSchema = z.object({
  timezone: timeZoneSchema,
  mainCurrency: currencySchema,
  confirmCurrencyChange: z.boolean().optional(),
  unsplitMode: unsplitModeSchema.optional(),
})

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>
