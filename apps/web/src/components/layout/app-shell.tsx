import type { ReactNode } from 'react'
import type { SessionResponse } from '@workspace/poco'

import { AppHeader } from '@/components/layout/app-header.js'
import { AppSidebar } from '@/components/layout/app-sidebar.js'
import { RecoveryCodesPrompt } from '@/components/layout/recovery-codes-prompt.js'
import { ServerResetNotice } from '@/components/layout/server-reset-notice.js'
import { TimezoneConfirmBanner } from '@/components/layout/timezone-confirm-banner.js'
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
      <AppSidebar tenantName={session.tenant.name} />
      <SidebarInset>
        <AppHeader user={session.user} />
        <ServerResetNotice />
        <TimezoneConfirmBanner />
        <RecoveryCodesPrompt />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
