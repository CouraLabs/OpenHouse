import { type ReactNode, useEffect, useMemo, useState } from 'react'

import {
  CONTENT,
  initialLocale,
  type Locale,
  storeLocale,
} from '@/lib/locale.js'
import { LocaleContext } from '@/lib/use-locale.js'

/**
 * Holds the page's locale: it opens in the stored pick or the browser's
 * language, and an explicit switch is remembered for the next visit. The
 * document's `lang`, title, and description follow it.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale)
  const content = CONTENT[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = content.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', content.meta.description)
  }, [locale, content])

  const value = useMemo(
    () => ({
      locale,
      content,
      setLocale: (next: Locale) => {
        storeLocale(next)
        setLocaleState(next)
      },
    }),
    [locale, content]
  )

  return <LocaleContext value={value}>{children}</LocaleContext>
}
