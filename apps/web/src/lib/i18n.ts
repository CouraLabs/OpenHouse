import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import enUS from '@/locales/en-US.json'

export const DEFAULT_LOCALE = 'en-US' as const

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
    escapeValue: false,
  },
})

export function changeLocale(locale: string): void {
  localStorage.setItem('locale', locale)
  void i18next.changeLanguage(locale)
}

export function formattingLocale(): string {
  return i18next.resolvedLanguage ?? DEFAULT_LOCALE
}
