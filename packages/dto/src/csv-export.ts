import { z } from "zod"
import {
  csvLocales,
  DEFAULT_CSV_LOCALE,
  type CsvLocale,
} from "@workspace/domain"

export { csvLocales, DEFAULT_CSV_LOCALE, type CsvLocale }

export const csvLocaleSchema = z.enum(csvLocales, {
  error: "Pick a supported locale.",
})

export const csvLocaleField = {
  locale: csvLocaleSchema.default(DEFAULT_CSV_LOCALE),
}
