import { Languages } from 'lucide-react'
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

const LOCALES = [DEFAULT_LOCALE] as const

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('language.label')}
          />
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
