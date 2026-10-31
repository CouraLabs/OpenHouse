import { enUS } from '@/locales/en-US.js'
import { ptBR } from '@/locales/pt-BR.js'

import type { Content } from './content.js'

export const CONTENT = {
  'en-US': enUS,
  'pt-BR': ptBR,
} as const satisfies Record<string, Content>

export type Locale = keyof typeof CONTENT

export const DEFAULT_LOCALE: Locale = 'pt-BR'

export const LOCALE_SHORT: Record<Locale, string> = {
  'en-US': 'EN',
  'pt-BR': 'PT',
}

const LOCALES = Object.keys(CONTENT) as Locale[]

const STORAGE_KEY = 'locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && LOCALES.includes(value as Locale)
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
): Locale | null {
  for (const tag of tags) {
    const exact = LOCALES.find(
      (locale) => locale.toLowerCase() === tag.toLowerCase()
    )
    if (exact) {
      return exact
    }
    const language = tag.split('-')[0]?.toLowerCase()
    const match = LOCALES.find((locale) =>
      locale.toLowerCase().startsWith(`${language}-`)
    )
    if (match) {
      return match
    }
  }
  return null
}

export function initialLocale(
  storage: Storage | null = safeStorage(),
  browserTags: readonly string[] = browserLanguageTags()
): Locale {
  const stored = storage ? storage.getItem(STORAGE_KEY) : null
  if (isLocale(stored)) {
    return stored
  }
  const resolved = detectBrowserLocale(browserTags) ?? DEFAULT_LOCALE
  storeLocale(resolved, storage)
  return resolved
}

export function storeLocale(
  locale: Locale,
  storage: Storage | null = safeStorage()
): void {
  storage?.setItem(STORAGE_KEY, locale)
}
