import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionResponse } from '@workspace/dto'

import { useSession } from '@/lib/auth.js'
import { AppHeader } from '@/components/layout/app-header.js'
import { AppSidebar } from '@/components/layout/app-sidebar.js'
import { InitialSetup } from '@/components/layout/initial-setup.js'
import { ServerResetNotice } from '@/components/layout/server-reset-notice.js'
import { TenantDeletionBanner } from '@/components/layout/tenant-deletion-banner.js'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { Toaster } from '@workspace/ui/components/toast'

export function AppShell({
  session: initialSession,
  children,
}: {
  session: SessionResponse
  children: ReactNode
}) {
  const { t } = useTranslation()
  const session = useSession().data ?? initialSession

  if (session.user.role === 'owner' && !session.settings.timezoneConfirmed) {
    return <InitialSetup tenantName={session.tenant.name} />
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('app.skip-to-content')}
      </a>
      <AppSidebar tenantName={session.tenant.name} />
      <SidebarInset className="overflow-hidden">
        <AppHeader user={session.user} />
        <TenantDeletionBanner />
        <ServerResetNotice />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto outline-none"
        >
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  )
}
