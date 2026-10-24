import { z } from 'zod'

/**
 * The CSV export contract shared by every `POST <entity>/export` route. An
 * export takes the same body as the entity's search — sort and filter — and
 * answers with every matching row, unpaged (`skip` and `limit` are
 * accepted so the page can send its search args as they are, and ignored).
 * The one addition is the locale the file is written in.
 */

/**
 * The locales a CSV is written in. `pt-BR` uses `;` as separator, `,` as the
 * decimal mark, and `DD/MM/YYYY` dates; `en-US` uses `,`, `.`, and ISO dates.
 */
export const csvLocales = ['en-US', 'pt-BR'] as const

export type CsvLocale = (typeof csvLocales)[number]

export const csvLocaleSchema = z.enum(csvLocales, {
  error: 'Pick a supported locale.',
})

/** The locale a body that names none is written in. */
export const DEFAULT_CSV_LOCALE: CsvLocale = 'en-US'

/** The locale shape every export body adds to its entity's search. */
export const csvLocaleField = {
  locale: csvLocaleSchema.default(DEFAULT_CSV_LOCALE),
}
