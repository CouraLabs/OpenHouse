import { Gauge, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { RecoveryCodesPrompt } from '@/components/layout/recovery-codes-prompt.js'
import { PageHeader } from '@/components/page-header.js'
import { useSession } from '@/lib/auth.js'
import { firstName } from '@/lib/first-name.js'
import { GoalGaugesCard } from '@/features/transactions/goal-gauges-card.js'
import { LimitUsageCard } from '@/features/transactions/limit-usage-card.js'
import {
  useGoals,
  useLimitUsage,
} from '@/features/transactions/use-dashboard.js'
import { UpcomingCard } from '@/features/upcoming/upcoming-card.js'
import { BalancesCard } from './balances-card.js'
import { MonthSummaryCard } from './month-summary-card.js'
import { formattingLocale } from '@/lib/i18n.js'

export function MainPage() {
  const { t } = useTranslation()
  const goals = useGoals()
  const limitUsage = useLimitUsage()
  const user = useSession().data?.user

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('nav.dashboard')}
        subtitle={
          user === undefined
            ? undefined
            : t('main.greeting', { name: firstName(user.name) })
        }
      />
      <RecoveryCodesPrompt />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            aria: (limit) => t('main.limit-aria', { name: limit.categoryName }),
            excluded: (limit) =>
              t('main.limit-excluded', { count: limit.excludedCount }),
          }}
        />
      </div>
    </main>
  )
}
