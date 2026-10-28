import type { ReactNode } from 'react'
import type { SessionResponse } from '@workspace/poco'

import { AppHeader } from '@/components/layout/app-header.js'
import { AppSidebar } from '@/components/layout/app-sidebar.js'
import { RecoveryCodesPrompt } from '@/components/layout/recovery-codes-prompt.js'
import { ServerResetNotice } from '@/components/layout/server-reset-notice.js'
import { TenantDeletionBanner } from '@/components/layout/tenant-deletion-banner.js'
import { TimezoneConfirmBanner } from '@/components/layout/timezone-confirm-banner.js'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { Toaster } from '@workspace/ui/components/toast'

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
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar tenantName={session.tenant.name} />
      <SidebarInset className="overflow-hidden">
        <AppHeader user={session.user} />
        <TenantDeletionBanner />
        <ServerResetNotice />
        <TimezoneConfirmBanner />
        <RecoveryCodesPrompt />
        {/* Pages scroll in here, not the document — the fixed-height shell
            keeps full-height pages (transactions) actually full-height so
            their virtualizers and sticky headers engage. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  )
}
