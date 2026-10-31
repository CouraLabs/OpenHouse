import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import enUS from '@/locales/en-US.json'
import ptBR from '@/locales/pt-BR.json'

export const DEFAULT_LOCALE = 'pt-BR' as const
export const SUPPORTED_LOCALES = ['en-US', 'pt-BR'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'locale'

function isSupportedLocale(value: string | null): value is SupportedLocale {
  return (
    value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function browserLanguageTags(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return []
  }
  return (
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
  ).filter(Boolean) as string[]
}

export function detectBrowserLocale(
  tags: readonly string[] = browserLanguageTags()
): SupportedLocale | null {
  for (const tag of tags) {
    const exact = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase() === tag.toLowerCase()
    )
    if (exact) {
      return exact
    }
    const language = tag.split('-')[0]?.toLowerCase()
    const prefixMatch = SUPPORTED_LOCALES.find((locale) =>
      locale.toLowerCase().startsWith(`${language}-`)
    )
    if (prefixMatch) {
      return prefixMatch
    }
  }
  return null
}

export function resolveInitialLocale(
  storage: Storage | null = safeStorage(),
  browserTags: readonly string[] = browserLanguageTags()
): SupportedLocale {
  const stored = storage ? storage.getItem(STORAGE_KEY) : null
  if (isSupportedLocale(stored)) {
    return stored
  }
  const resolved = detectBrowserLocale(browserTags) ?? DEFAULT_LOCALE
  storage?.setItem(STORAGE_KEY, resolved)
  return resolved
}

const activeLocale = resolveInitialLocale()

if (typeof document !== 'undefined') {
  document.documentElement.lang = activeLocale
}

void i18next.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
    'pt-BR': { translation: ptBR },
  },
  lng: activeLocale,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
})

i18next.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
})

export function changeLocale(locale: string): void {
  safeStorage()?.setItem(STORAGE_KEY, locale)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
  void i18next.changeLanguage(locale)
}

export function formattingLocale(): string {
  return i18next.resolvedLanguage ?? DEFAULT_LOCALE
}
