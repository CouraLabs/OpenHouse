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
      className="border-line-2 hover:bg-ink hover:text-on-ink text-ink size-[38px] shrink-0 rounded-full border font-mono text-[11px] transition-[color,background-color,transform] duration-200 active:scale-[0.98]"
    >
      {LOCALE_SHORT[locale]}
    </button>
  )
}
