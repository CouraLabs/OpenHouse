import { Breadcrumb, BreadcrumbList } from '@workspace/ui/components/breadcrumb'
import { Separator } from '@workspace/ui/components/separator'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'

import { LocaleSwitcher } from '@/components/layout/locale-switcher.js'
import { RouteBreadcrumbs } from '@/components/layout/route-breadcrumbs.js'
import { ThemeSwitcher } from '@/components/layout/theme-switcher.js'

/**
 * The application top bar: sidebar trigger and breadcrumb on the left, theme
 * and language switchers on the right. Renders inside `SidebarInset`.
 */
export function AppHeader() {
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
      </div>
    </header>
  )
}
