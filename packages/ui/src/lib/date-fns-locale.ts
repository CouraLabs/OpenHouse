import { de, enUS, es, fr, it, ptBR, type Locale } from 'date-fns/locale'

/**
 * The date-fns locales the picker grid can speak, keyed by BCP-47 tag. The
 * fallback is the app's default locale — an unmapped language still renders
 * an English grid rather than failing.
 */
const locales: Record<string, Locale> = {
  'en-US': enUS,
  'pt-BR': ptBR,
  es,
  fr,
  de,
  it,
}

/**
 * Resolves a BCP-47 tag onto a date-fns locale: an exact hit first, then the
 * language alone (`pt-PT` → `pt`), then the default.
 */
export function toDateFnsLocale(locale: string): Locale {
  return locales[locale] ?? locales[locale.split('-')[0] ?? ''] ?? enUS
}
