import { z } from 'zod'

export const csvLocales = ['en-US', 'pt-BR'] as const

export type CsvLocale = (typeof csvLocales)[number]

export const csvLocaleSchema = z.enum(csvLocales, {
  error: 'Pick a supported locale.',
})

export const DEFAULT_CSV_LOCALE: CsvLocale = 'en-US'

export const csvLocaleField = {
  locale: csvLocaleSchema.default(DEFAULT_CSV_LOCALE),
}
