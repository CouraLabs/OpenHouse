import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { currentSession } from '@/lib/query.js'
import { SignInPage } from '@/features/sign-in/sign-in-page.js'
import { SignUpPage } from '@/features/sign-up/sign-up-page.js'
import { MainLayout } from '@/components/layout/main-layout.js'

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

const routeTree = rootRoute.addChildren([signInRoute, signUpRoute, mainRoute])

/** The browser router the app mounts once the session query settles. */
export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
})
