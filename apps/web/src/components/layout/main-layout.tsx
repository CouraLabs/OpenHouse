import { redirect, Outlet } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell.js'
import { currentSession } from '@/lib/query.js'

/**
 * The signed-in chrome: the application shell wraps every page route. The
 * session is read from the cache — the route's `beforeLoad` guarantees it is
 * there when this renders. The matched page renders in the shell's slot.
 */
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
