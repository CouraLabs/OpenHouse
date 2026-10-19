import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthHero } from '@/components/layout/auth-hero.js'
import { BrandMark } from '@workspace/ui/components/brand-mark'
import { LocaleSwitcher } from '@/components/layout/locale-switcher.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'

/**
 * The chrome of the signed-out pages: an editorial split — the hero on the
 * left, the brand and switchers above the page's form on the right, the form
 * seated in a double-bezel card. The app shell takes over once a session
 * exists.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="grid min-h-[100dvh] gap-3 p-3 md:grid-cols-2">
      <AuthHero />
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="font-heading text-lg tracking-tight">
              {t('app.name')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md animate-page-in rounded-[2rem] bg-foreground/[0.03] p-1.5 ring-1 ring-foreground/[0.06]">
            <div className="flex justify-center rounded-[calc(2rem-0.375rem)] bg-card p-8 shadow-soft sm:p-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
