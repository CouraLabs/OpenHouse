import { LOCALE_SHORT } from '@/lib/locale.js'
import { useLocale } from '@/lib/use-locale.js'

export function LocaleToggle() {
  const { locale, content, setLocale } = useLocale()

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en-US' ? 'pt-BR' : 'en-US')}
      aria-label={content.navActions.localeToggle}
      className="border-line-2 bg-surface text-ink size-10 shrink-0 rounded-full border text-xs font-semibold transition-[color,background-color,transform] duration-200 hover:bg-surface-2 active:scale-[0.98]"
    >
      {LOCALE_SHORT[locale]}
    </button>
  )
}
