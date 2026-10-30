import { enUS } from '@/locales/en-US.js'
import { ptBR } from '@/locales/pt-BR.js'

import type { Content } from './content.js'

export const CONTENT = {
  'en-US': enUS,
  'pt-BR': ptBR,
} as const satisfies Record<string, Content>

export type Locale = keyof typeof CONTENT

export const DEFAULT_LOCALE: Locale = 'en-US'

export const LOCALE_SHORT: Record<Locale, string> = {
  'en-US': 'EN',
  'pt-BR': 'PT',
}

const LOCALES = Object.keys(CONTENT) as Locale[]

const STORAGE_KEY = 'locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && LOCALES.includes(value as Locale)
}

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

export function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isLocale(stored)) {
    return stored
  }
  return browserLocale() ?? DEFAULT_LOCALE
}

export function storeLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}
