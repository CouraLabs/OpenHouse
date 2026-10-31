import type { ReactNode } from 'react'

import { AuthHero } from '@/components/layout/auth-hero.js'
import { BrandName } from '@/components/layout/brand-name.js'
import { BrandMark } from '@workspace/ui/components/brand-mark'
import { LocaleSwitcher } from '@/components/layout/locale-switcher.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] gap-3 p-3 md:grid-cols-2">
      <AuthHero />
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <BrandName className="text-lg" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md animate-page-in">
            <div className="flex justify-center rounded-3xl bg-card p-7 shadow-lift sm:p-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
