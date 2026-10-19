import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'

import { useTheme } from '@workspace/ui/components/theme-provider'

/** Whether the OS prefers dark — what a `system` theme renders as. */
function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * The theme toggle: one click flips between light and dark. A stored
 * `system` theme reads as whatever the OS renders, and the first click
 * leaves it for the opposite. Extracted from the app header so the auth
 * pages offer the same control.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  const next = isDark ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t(`theme.switch-to-${next}`)}
      title={t(`theme.switch-to-${next}`)}
      onClick={() => setTheme(next)}
    >
      {isDark ? <Moon /> : <Sun />}
    </Button>
  )
}
