import { useTranslation } from 'react-i18next'
import { DEFAULT_UPCOMING_DAYS } from '@workspace/dto'

import { RecoveryCodesPrompt } from '@/components/layout/recovery-codes-prompt.js'
import { PageHeader } from '@/components/page-header.js'
import { useSession } from '@/lib/auth.js'
import { firstName } from '@/lib/first-name.js'
import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useTenantToday } from '@/lib/settings.js'
import { GoalGaugesCard } from '@/features/transactions/goal-gauges-card.js'
import { LimitUsageCard } from '@/features/transactions/limit-usage-card.js'
import {
  useGoals,
  useLimitUsage,
} from '@/features/transactions/use-dashboard.js'
import { useUpcoming } from '@/features/upcoming/use-upcoming.js'
import { BalancesCard } from './balances-card.js'
import { CoverCard } from './cover-card.js'
import { GoingOutCard } from './going-out-card.js'
import { HomeKpis } from './home-kpis.js'

export function MainPage() {
  const { t } = useTranslation()
  const goals = useGoals()
  const limitUsage = useLimitUsage()
  const upcoming = useUpcoming(DEFAULT_UPCOMING_DAYS)
  const user = useSession().data?.user
  const today = useTenantToday()
  const locale = formattingLocale()

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        context={
          <p className="text-[0.8125rem] text-muted-foreground">
            {formatDayLabel(today, locale, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        }
        title={t('nav.dashboard')}
        subtitle={
          user === undefined
            ? undefined
            : t('main.greeting', { name: firstName(user.name) })
        }
      />
      <RecoveryCodesPrompt />
      <HomeKpis upcoming={upcoming.data} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <CoverCard upcoming={upcoming.data} isError={upcoming.isError} />
          <GoingOutCard upcoming={upcoming.data} isError={upcoming.isError} />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <BalancesCard />
          <LimitUsageCard
            title={t('main.limits')}
            description={t('home.limits-subtitle')}
            usage={limitUsage.data ?? []}
            locale={locale}
            labels={{
              empty: t('main.limits-empty'),
              aria: (limit) =>
                t('main.limit-aria', { name: limit.categoryName }),
              excluded: (limit) =>
                t('main.limit-excluded', { count: limit.excludedCount }),
              used: (percent) => t('home.limit-used', { percent }),
            }}
          />
          <GoalGaugesCard
            title={t('main.goals')}
            description={t('home.goals-subtitle')}
            goals={goals.data?.items ?? []}
            locale={locale}
            ariaLabelFor={(goal) => t('main.goal-aria', { name: goal.name })}
            labels={{
              empty: t('main.goals-empty'),
              currencyMismatch: t('goals.currency-mismatch'),
              of: t('home.goal-of'),
            }}
          />
        </aside>
      </div>
    </main>
  )
}
