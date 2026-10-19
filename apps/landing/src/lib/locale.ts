import { enUS } from '@/locales/en-US.js'
import { ptBR } from '@/locales/pt-BR.js'

import type { Content } from './content.js'

/** Every locale the page ships, each with its words. */
export const CONTENT = {
  'en-US': enUS,
  'pt-BR': ptBR,
} as const satisfies Record<string, Content>

export type Locale = keyof typeof CONTENT

/** Where nothing else decides — no stored pick, no browser match. */
export const DEFAULT_LOCALE: Locale = 'en-US'

/** The short label each locale shows on the nav toggle. */
export const LOCALE_SHORT: Record<Locale, string> = {
  'en-US': 'EN',
  'pt-BR': 'PT',
}

const LOCALES = Object.keys(CONTENT) as Locale[]

/** Same key as the web app, so a shared origin remembers one choice. */
const STORAGE_KEY = 'locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && LOCALES.includes(value as Locale)
}

/**
 * The first browser language the page speaks, matched on the language
 * subtag alone so `pt-PT` reads Brazilian Portuguese and `en-GB` American
 * English; `null` when none matches.
 */
function browserLocale(): Locale | null {
  for (const tag of navigator.languages) {
    const language = tag.split('-')[0]?.toLowerCase()
    const match = LOCALES.find((locale) => locale.startsWith(`${language}-`))
    if (match) {
      return match
    }
  }
  return null
}

/**
 * The locale to open in: the visitor's last pick, else their browser's
 * language, else the default.
 */
export function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isLocale(stored)) {
    return stored
  }
  return browserLocale() ?? DEFAULT_LOCALE
}

/** Remembers an explicit pick so the next visit opens in it. */
export function storeLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}
