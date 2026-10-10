import { Languages, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

import { changeLocale, DEFAULT_LOCALE } from '@/lib/i18n.js'
import { useTheme } from '@/components/layout/theme-provider.js'

/** The themes the switcher offers, in display order. */
const THEMES = ['light', 'dark', 'system'] as const

/** The locales the switcher offers; one ships today, more land as they are translated. */
const LOCALES = [DEFAULT_LOCALE] as const

/** The icons the theme options read as. */
const THEME_ICONS: Record<(typeof THEMES)[number], LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

/**
 * The theme dropdown: Light, Dark, System via the theme provider. Extracted
 * from the app header so the auth pages offer the same control.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const CurrentIcon = THEME_ICONS[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t('theme.label')} />
        }
      >
        <CurrentIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEMES.map((value) => {
            const Icon = THEME_ICONS[value]

            return (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon />
                {t(`theme.${value}`)}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The language dropdown; changes apply live and persist across reloads.
 * Extracted from the app header so the auth pages offer the same control.
 */
export function LocaleSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t('language.label')} />
        }
      >
        <Languages />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={i18n.language}
          onValueChange={(locale) => changeLocale(locale)}
        >
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {t(`language.${locale}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
