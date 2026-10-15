import type { ReactNode } from 'react'
import type { SessionResponse } from '@workspace/poco'

import { AppHeader } from '@/components/layout/app-header.js'
import { AppSidebar } from '@/components/layout/app-sidebar.js'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'

/**
 * The signed-in application wrapper: sidebar on the left, header on top of
 * the inset, and the current page rendered as the only content. Deliberately
 * generic — the shell owns no page content.
 */
export function AppShell({
  session,
  children,
}: {
  session: SessionResponse
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={session.user} tenantName={session.tenant.name} />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
