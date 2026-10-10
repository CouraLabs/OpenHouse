import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import enUS from '@/locales/en-US.json'

/**
 * The only locale shipped today; the switcher grows as locales land here.
 * The browser language is deliberately ignored — the app starts in its
 * default until the user picks otherwise.
 */
export const DEFAULT_LOCALE = 'en-US' as const

/**
 * The locale the user last picked, persisted across reloads; `null` until
 * they do.
 */
function storedLocale(): string | null {
  return localStorage.getItem('locale')
}

void i18next.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
  },
  lng: storedLocale() ?? DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    // React already escapes rendered strings; double-escaping is not wanted.
    escapeValue: false,
  },
})

/** Switches the app language live and remembers the choice across reloads. */
export function changeLocale(locale: string): void {
  localStorage.setItem('locale', locale)
  void i18next.changeLanguage(locale)
}
