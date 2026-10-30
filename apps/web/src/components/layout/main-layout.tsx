import { redirect, Outlet } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell.js'
import { currentSession } from '@/lib/query.js'

export function MainLayout() {
  const session = currentSession()

  if (session === null) {
    throw redirect({ to: '/sign-in' })
  }

  return (
    <AppShell session={session}>
      <Outlet />
    </AppShell>
  )
}
