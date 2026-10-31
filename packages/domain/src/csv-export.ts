export const csvLocales = ["en-US", "pt-BR"] as const

export type CsvLocale = (typeof csvLocales)[number]

export const DEFAULT_CSV_LOCALE: CsvLocale = "en-US"
