import { LOCALE_SHORT } from '@/lib/locale.js'
import { useLocale } from '@/lib/use-locale.js'

/**
 * Flips between English and Portuguese, sized and bordered like the theme
 * toggle beside it. It shows the active language; the accessible name, in
 * the other language, says what a press does.
 */
export function LocaleToggle() {
  const { locale, content, setLocale } = useLocale()

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en-US' ? 'pt-BR' : 'en-US')}
      aria-label={content.navActions.localeToggle}
      className="border-line hover:bg-bone hover:text-ink h-8 shrink-0 rounded-md border px-2 font-mono text-[11px] text-muted transition-[color,background-color,transform] duration-200 active:scale-[0.98]"
    >
      {LOCALE_SHORT[locale]}
    </button>
  )
}
