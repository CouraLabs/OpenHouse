import { de, enUS, es, fr, it, ptBR, type Locale } from 'date-fns/locale'

const locales: Record<string, Locale> = {
  'en-US': enUS,
  'pt-BR': ptBR,
  es,
  fr,
  de,
  it,
}

export function toDateFnsLocale(locale: string): Locale {
  return locales[locale] ?? locales[locale.split('-')[0] ?? ''] ?? enUS
}
