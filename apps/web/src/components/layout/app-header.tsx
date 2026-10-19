import { Breadcrumb, BreadcrumbList } from '@workspace/ui/components/breadcrumb'
import type { SessionUser } from '@workspace/poco'
import { Separator } from '@workspace/ui/components/separator'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'

import { LocaleSwitcher } from '@/components/layout/locale-switcher.js'
import { RouteBreadcrumbs } from '@/components/layout/route-breadcrumbs.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'
import { UserMenu } from '@/components/layout/user-menu.js'

/**
 * The application top bar: sidebar trigger and breadcrumb on the left; theme
 * and language switchers, then the user menu, on the right. Renders inside
 * `SidebarInset`.
 */
export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-foreground/[0.06] bg-background/40 px-4 backdrop-blur-2xl backdrop-saturate-150 md:rounded-t-3xl md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 self-center!" />
      <Breadcrumb>
        <BreadcrumbList>
          <RouteBreadcrumbs />
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-1">
        <ThemeSwitcher />
        <LocaleSwitcher />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
