import { Gauge, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'
import { GoalGaugesCard } from '@/features/transactions/goal-gauges-card.js'
import { LimitUsageCard } from '@/features/transactions/limit-usage-card.js'
import { useGoals, useLimitUsage } from '@/features/transactions/use-dashboard.js'
import { UpcomingCard } from '@/features/upcoming/upcoming-card.js'
import { BalancesCard } from './balances-card.js'
import { MonthSummaryCard } from './month-summary-card.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The page a signed-in user lands on: the house's balances lead — the
 * "every coin in the house, in its place" moment — then the month's flow,
 * what is coming due, and the gauges for goals and limits. The application
 * shell owns the chrome (sidebar, header, sign-out); this is a page slot.
 */
export function MainPage() {
  const { t } = useTranslation()
  const goals = useGoals()
  const limitUsage = useLimitUsage()

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader title={t('nav.dashboard')} subtitle={t('app.headline')} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BalancesCard className="md:col-span-2" />
        <MonthSummaryCard />
        <UpcomingCard />
        <GoalGaugesCard
          title={t('main.goals')}
          icon={<Target aria-hidden className="size-4" />}
          goals={goals.data?.items ?? []}
          locale={formattingLocale()}
          ariaLabelFor={(goal) => t('main.goal-aria', { name: goal.name })}
          labels={{
            empty: t('main.goals-empty'),
            currencyMismatch: t('goals.currency-mismatch'),
          }}
        />
        <LimitUsageCard
          title={t('main.limits')}
          icon={<Gauge aria-hidden className="size-4" />}
          usage={limitUsage.data ?? []}
          locale={formattingLocale()}
          labels={{
            empty: t('main.limits-empty'),
            aria: (limit) =>
              t('main.limit-aria', { name: limit.categoryName }),
            excluded: (limit) =>
              t('main.limit-excluded', { count: limit.excludedCount }),
          }}
        />
      </div>
    </main>
  )
}
