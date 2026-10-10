import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import type { SessionResponse } from '@workspace/poco'
import { House } from 'lucide-react'
import { SESSION_QUERY_KEY, useSession } from '@/lib/auth.js'
import { SignInPage } from '@/features/sign-in/sign-in-page.js'
import { SignUpPage } from '@/features/sign-up/sign-up-page.js'
import { MainPage } from '@/features/main/main-page.js'
import { AppShell } from '@/components/layout/app-shell.js'

/** The query client every query and mutation of the app shares. */
const queryClient = new QueryClient()

/**
 * The session the cache currently holds, or `null` while it holds none. The
 * route guards read this instead of a snapshot handed over at navigation
 * time: a sign-in updates the cache and navigates in the same tick, and the
 * guard must see the cache of that tick, not the props of the last render.
 */
function currentSession(): SessionResponse | null {
  return queryClient.getQueryData<SessionResponse | null>(SESSION_QUERY_KEY) ?? null
}

/** The root route renders nothing but the matched child. */
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => <p>Nothing here.</p>,
})

/** The route a signed-out user signs in from. */
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
  beforeLoad: () => {
    if (currentSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
})

/** The route a new user — or one joining with a code — signs up from. */
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
  beforeLoad: () => {
    if (currentSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
})

/** The page a signed-in user lands on; anything else is sent to sign-in. */
const mainRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MainLayout,
  beforeLoad: () => {
    if (currentSession() === null) {
      throw redirect({ to: '/sign-in' })
    }
  },
})

/**
 * The signed-in chrome: the application shell wraps every page route. The
 * session is read from the cache — the `beforeLoad` above guarantees it is
 * there when this renders.
 */
function MainLayout() {
  const session = currentSession()

  if (session === null) {
    throw redirect({ to: '/sign-in' })
  }

  return (
    <AppShell session={session}>
      <MainPage />
    </AppShell>
  )
}

const routeTree = rootRoute.addChildren([signInRoute, signUpRoute, mainRoute])

const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
})

/**
 * The application shell: the query client above every page, the router below
 * it. `App` renders the provider only; `RoutedApp` sits inside it and reads
 * the session through `useSession`.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoutedApp />
    </QueryClientProvider>
  )
}

/**
 * Waits for the session query to settle once, then mounts the router. The
 * guards read the query cache (`currentSession`), so from here on every
 * navigation — including the one a sign-in or sign-out triggers — is
 * decided by the cache of that moment and never flickers.
 */
function RoutedApp() {
  const session = useSession()

  if (session.isPending) {
    return <SessionSplash />
  }

  return <RouterProvider router={router} />
}

/**
 * What the session gate renders while the first `/auth/me` call settles. A
 * bare `null` here reads as a broken app whenever the API is slow or offline
 * — a visible splash keeps the refresh from looking like a blank page. The
 * session query retries and times out, so this always resolves.
 */
function SessionSplash() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center">
      <House className="size-8 animate-pulse text-muted-foreground" />
    </div>
  )
}
