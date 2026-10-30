import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'

import { useTheme } from '@workspace/ui/components/theme-provider'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

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
