import type { CsvLocale } from '@workspace/poco'

/** The CSV locale the interface language maps to: Portuguese writes
 * pt-BR files (`;`, decimal comma, DD/MM/YYYY), anything else en-US. */
export function csvLocaleOf(language: string): CsvLocale {
  return language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
}
