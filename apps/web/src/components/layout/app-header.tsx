import { Breadcrumb, BreadcrumbList } from '@workspace/ui/components/breadcrumb'
import type { SessionUser } from '@workspace/dto'
import { Separator } from '@workspace/ui/components/separator'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'

import { NotificationBell } from '@/components/layout/notification-bell.js'
import { LocaleSwitcher } from '@/components/layout/locale-switcher.js'
import { RouteBreadcrumbs } from '@/components/layout/route-breadcrumbs.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'
import { UserMenu } from '@/components/layout/user-menu.js'

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-nav-glass px-4 backdrop-blur-[18px] backdrop-saturate-150 backdrop-saturate-[1.4] md:rounded-t-3xl md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 self-center!" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <RouteBreadcrumbs />
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-1">
        <ThemeSwitcher />
        <LocaleSwitcher />
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
