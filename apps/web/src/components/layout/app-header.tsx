import { SidebarTrigger } from '@workspace/ui/components/sidebar'

import { BrandName } from '@/components/layout/brand-name.js'

import { CommandPalette } from '@/components/layout/command-palette.js'
import { MonthNetPill } from '@/components/layout/month-net-pill.js'
import { NewTransactionButton } from '@/components/layout/new-transaction-button.js'
import { NotificationBell } from '@/components/layout/notification-bell.js'
import { PrivacyToggle } from '@/components/layout/privacy-toggle.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'

export function AppHeader() {
  return (
    <header className="z-10 flex shrink-0 items-center gap-2 px-4 pt-4 pb-2 md:gap-3 md:px-8 md:pt-5">
      <SidebarTrigger className="size-10 rounded-full md:hidden" />
      <BrandName className="text-[1.0625rem] md:hidden" />
      <CommandPalette />
      <div className="flex items-center gap-2 sm:ml-auto">
        <MonthNetPill />
        <PrivacyToggle />
        <ThemeSwitcher />
        <NotificationBell />
        <NewTransactionButton />
      </div>
    </header>
  )
}
