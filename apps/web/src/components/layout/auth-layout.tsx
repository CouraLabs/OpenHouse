import { House } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LocaleSwitcher } from '@/components/layout/locale-switcher.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'

/**
 * The chrome of the signed-out pages: the brand (logo mark and app name) top
 * left, the theme and language switchers top right, and the page's form
 * centered. The app shell takes over once a session exists.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <House className="size-4" />
          </div>
          <span className="font-semibold">{t('app.name')}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  )
}
