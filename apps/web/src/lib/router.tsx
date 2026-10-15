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
import { CategoriesPage } from '@/features/categories/categories-page.js'
import { LimitsPage } from '@/features/limits/limits-page.js'
import { GoalsPage } from '@/features/goals/goals-page.js'
import { AccountsPage } from '@/features/accounts/accounts-page.js'
import { TransactionsPage } from '@/features/transactions/transactions-page.js'
import { ReceiversPage } from '@/features/receivers/receivers-page.js'
import { TransactionLinkersPage } from '@/features/transaction-linkers/transaction-linkers-page.js'
import { RecurringTransactionsPage } from '@/features/recurring-transactions/recurring-transactions-page.js'
import { MainPage } from '@/features/main/main-page.js'
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

/**
 * The signed-in area: the shell every page renders in. A pathless layout —
 * it owns no URL segment, so its children can claim `/` themselves. The
 * session is read from the cache; the guard below guarantees it is there
 * when the pages render.
 */
const mainLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_main',
  component: MainLayout,
  beforeLoad: () => {
    if (currentSession() === null) {
      throw redirect({ to: '/sign-in' })
    }
  },
})

/** The page a signed-in user lands on. */
const indexRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/',
  component: MainPage,
})

/** The page the tenant's categories are managed from. */
const categoriesRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'categories',
  component: CategoriesPage,
})

/** The page the tenant's limits are managed from. */
const limitsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'limits',
  component: LimitsPage,
})

/** The page the tenant's goals are managed from. */
const goalsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'goals',
  component: GoalsPage,
})

/** The page the tenant's accounts are managed from. */
const accountsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'accounts',
  component: AccountsPage,
})

/** The page the tenant's transactions are managed from. */
const transactionsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'transactions',
  component: TransactionsPage,
})

/** The page the tenant's receivers are managed from. */
const receiversRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'receivers',
  component: ReceiversPage,
})

/** The page the tenant's transaction linkers are managed from. */
const transactionLinkersRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'transaction-linkers',
  component: TransactionLinkersPage,
})

/** The page the tenant's recurring rules are managed from. */
const recurringTransactionsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'recurring-transactions',
  component: RecurringTransactionsPage,
})

const routeTree = rootRoute.addChildren([
  signInRoute,
  signUpRoute,
  mainLayoutRoute.addChildren([
    indexRoute,
    categoriesRoute,
    limitsRoute,
    goalsRoute,
    accountsRoute,
    transactionsRoute,
    receiversRoute,
    transactionLinkersRoute,
    recurringTransactionsRoute,
  ]),
])

/** The browser router the app mounts once the session query settles. */
export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
})
