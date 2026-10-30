import { createContext, useContext } from 'react'

import type { Content } from './content.js'
import type { Locale } from './locale.js'

export interface LocaleState {
  locale: Locale
  content: Content
  setLocale: (locale: Locale) => void
}

export const LocaleContext = createContext<LocaleState | null>(null)

export function useLocale(): LocaleState {
  const state = useContext(LocaleContext)
  if (!state) {
    throw new Error('useLocale must be used inside LocaleProvider')
  }
  return state
}

export function useContent(): Content {
  return useLocale().content
}
