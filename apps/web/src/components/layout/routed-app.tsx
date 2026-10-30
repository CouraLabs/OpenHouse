import { RouterProvider } from '@tanstack/react-router'
import { useSession } from '@/lib/auth.js'
import { router } from '@/lib/router.js'
import { SessionSplash } from '@/components/layout/session-splash.js'

export function RoutedApp() {
  const session = useSession()

  if (session.isPending) {
    return <SessionSplash />
  }

  return <RouterProvider router={router} />
}
