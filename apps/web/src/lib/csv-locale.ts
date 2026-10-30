import type { CsvLocale } from '@workspace/poco'

export function csvLocaleOf(language: string): CsvLocale {
  return language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
}
