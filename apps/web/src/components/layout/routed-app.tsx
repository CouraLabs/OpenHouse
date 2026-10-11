import { RouterProvider } from '@tanstack/react-router'
import { useSession } from '@/lib/auth.js'
import { router } from '@/lib/router.js'
import { SessionSplash } from '@/components/layout/session-splash.js'

/**
 * Waits for the session query to settle once, then mounts the router. The
 * guards read the query cache (`currentSession`), so from here on every
 * navigation — including the one a sign-in or sign-out triggers — is
 * decided by the cache of that moment and never flickers.
 */
export function RoutedApp() {
  const session = useSession()

  if (session.isPending) {
    return <SessionSplash />
  }

  return <RouterProvider router={router} />
}
