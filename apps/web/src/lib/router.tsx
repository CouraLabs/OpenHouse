import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { APP_BASE } from '@/lib/app-url.js'
import { currentSession } from '@/lib/query.js'
import { SignInPage } from '@/features/sign-in/sign-in-page.js'
import { SignUpPage } from '@/features/sign-up/sign-up-page.js'
import { ResetPasswordPage } from '@/features/reset-password/reset-password-page.js'
import { VerifyEmailPage } from '@/features/verify-email/verify-email-page.js'
import { CategoriesPage } from '@/features/categories/categories-page.js'
import { LimitsPage } from '@/features/limits/limits-page.js'
import { HouseholdPage } from '@/features/household/household-page.js'
import { GoalsPage } from '@/features/goals/goals-page.js'
import { AccountsPage } from '@/features/accounts/accounts-page.js'
import { TransactionsPage } from '@/features/transactions/transactions-page.js'
import { ImportPage } from '@/features/statement-imports/import-page.js'
import { BillDetailPage } from '@/features/bills/bill-detail-page.js'
import { BillsPage } from '@/features/bills/bills-page.js'
import { ReceiversPage } from '@/features/receivers/receivers-page.js'
import { TransactionLinkersPage } from '@/features/transaction-linkers/transaction-linkers-page.js'
import { RecurringTransactionsPage } from '@/features/recurring-transactions/recurring-transactions-page.js'
import { MainPage } from '@/features/main/main-page.js'
import { UpcomingPage } from '@/features/upcoming/upcoming-page.js'
import { TipsPage } from '@/features/tips/tips-page.js'
import { InterestComparisonPage } from '@/features/interest-comparison/interest-comparison-page.js'
import { RateConversionPage } from '@/features/rate-conversion/rate-conversion-page.js'
import { FinancialIndependencePage } from '@/features/financial-independence/financial-independence-page.js'
import { RentVsBuyPage } from '@/features/rent-vs-buy/rent-vs-buy-page.js'
import { SettingsPage } from '@/features/settings/settings-page.js'
import { isSectionFor } from '@/features/settings/settings-sections.js'
import { NotFound } from '@/components/not-found.js'
import { MainLayout } from '@/components/layout/main-layout.js'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFound,
})

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
  beforeLoad: () => {
    const session = currentSession()

    if (session !== null) {
      throw redirect({ to: session.user.startPage })
    }
  },
})

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
  validateSearch: (search: Record<string, unknown>): { code?: string } =>
    typeof search.code === 'string' && search.code !== ''
      ? { code: search.code }
      : {},
  beforeLoad: () => {
    if (currentSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
})

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>): { token?: string } =>
    typeof search.token === 'string' && search.token !== ''
      ? { token: search.token }
      : {},
  beforeLoad: ({ search }) => {
    if (search.token === undefined && currentSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
})

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

const indexRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/',
  component: MainPage,
})

const categoriesRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'categories',
  component: CategoriesPage,
})

const limitsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'limits',
  component: LimitsPage,
})

const goalsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'goals',
  component: GoalsPage,
})

const householdRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'household',
  component: HouseholdPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'accounts',
  component: AccountsPage,
})

const accountImportRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'accounts/$accountId/import',
  component: ImportPage,
})

const transactionsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'transactions',
  component: TransactionsPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { new?: boolean; transfer?: boolean } => ({
    ...(search.new === true || search.new === 'true' ? { new: true } : {}),
    ...(search.transfer === true || search.transfer === 'true'
      ? { transfer: true }
      : {}),
  }),
})

const billsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'bills',
  component: BillsPage,
  validateSearch: (search: Record<string, unknown>): { accountId?: number } => {
    const accountId = Number(search.accountId)

    return Number.isInteger(accountId) && accountId > 0 ? { accountId } : {}
  },
})

const billDetailRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'bills/$statementId',
  component: BillDetailPage,
  validateSearch: (search: Record<string, unknown>): { pay?: boolean } =>
    search.pay === true || search.pay === 'true' ? { pay: true } : {},
})

const receiversRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'receivers',
  component: ReceiversPage,
})

const transactionLinkersRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'transaction-linkers',
  component: TransactionLinkersPage,
})

const recurringTransactionsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'recurring-transactions',
  component: RecurringTransactionsPage,
})

const upcomingRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'upcoming',
  component: UpcomingPage,
})

const tipsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'tips',
  component: TipsPage,
})

const interestComparisonRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'tips/interest-comparison',
  component: InterestComparisonPage,
})

const rateConversionRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'tips/rate-conversion',
  component: RateConversionPage,
})

const financialIndependenceRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'tips/financial-independence',
  component: FinancialIndependencePage,
})

const rentVsBuyRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'tips/rent-vs-buy',
  component: RentVsBuyPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'settings',
  component: SettingsPage,
})

const settingsSectionRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: 'settings/$section',
  component: SettingsPage,
  beforeLoad: ({ params }) => {
    const role = currentSession()?.user.role ?? 'user'

    if (!isSectionFor(role, params.section)) {
      throw redirect({ to: '/settings' })
    }
  },
})

const routeTree = rootRoute.addChildren([
  signInRoute,
  signUpRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  mainLayoutRoute.addChildren([
    indexRoute,
    categoriesRoute,
    limitsRoute,
    goalsRoute,
    householdRoute,
    accountsRoute,
    accountImportRoute,
    transactionsRoute,
    billsRoute,
    billDetailRoute,
    receiversRoute,
    transactionLinkersRoute,
    recurringTransactionsRoute,
    upcomingRoute,
    tipsRoute,
    interestComparisonRoute,
    rateConversionRoute,
    financialIndependenceRoute,
    rentVsBuyRoute,
    settingsRoute,
    settingsSectionRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  basepath: APP_BASE,
})

declare module '@tanstack/react-router' {
  interface HistoryState {
    email?: string
  }
}
