import { createContext, useContext } from 'react'

import type { Content } from './content.js'
import type { Locale } from './locale.js'

/** What `LocaleProvider` hands down: the active locale, its words, the switch. */
export interface LocaleState {
  locale: Locale
  content: Content
  setLocale: (locale: Locale) => void
}

export const LocaleContext = createContext<LocaleState | null>(null)

/** The active locale and the switch; only inside `LocaleProvider`. */
export function useLocale(): LocaleState {
  const state = useContext(LocaleContext)
  if (!state) {
    throw new Error('useLocale must be used inside LocaleProvider')
  }
  return state
}

/** Every word the page shows, in the active locale. */
export function useContent(): Content {
  return useLocale().content
}
