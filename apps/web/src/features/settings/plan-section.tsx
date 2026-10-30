import { useTranslation } from 'react-i18next'
import { TIER_PLANS, type TierResource } from '@workspace/poco'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useTierStatus } from '@/lib/tier-status.js'
import { PlanCard } from './plan-card.js'
import { PlanUsageRow } from './plan-usage-row.js'

const PUBLIC_PLANS = [
  TIER_PLANS[0],
  TIER_PLANS[1],
  TIER_PLANS[2],
  TIER_PLANS[3],
]

const RESOURCE_ORDER: TierResource[] = [
  'accounts',
  'categories',
  'receivers',
  'transactionLinkers',
  'limits',
  'goals',
  'recurringTransactions',
]

export function PlanSection() {
  const { t } = useTranslation()
  const status = useTierStatus()

  if (status.data === undefined) {
    return (
      <p className="text-sm text-muted-foreground">
        {status.isError ? t('settings.error') : t('settings.plan.loading')}
      </p>
    )
  }

  const { plan, usage, transactionWindowStart } = status.data
  const unlimited = t('settings.plan.unlimited')

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-medium tracking-tight">
          {t('settings.plan.title', { name: plan.name })}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {t('settings.plan.description')}
        </p>
        {transactionWindowStart !== null && (
          <p className="text-sm text-pretty">
            {t('settings.plan.window', {
              date: formatDayLabel(transactionWindowStart, formattingLocale(), {
                dateStyle: 'long',
              }),
            })}
          </p>
        )}
        <ul className="divide-y divide-foreground/[0.06] rounded-2xl bg-card px-5 shadow-soft ring-1 ring-foreground/[0.06]">
          <PlanUsageRow
            label={t('settings.plan.usage-users')}
            used={usage.users}
            limit={plan.maxUsers}
            unlimitedLabel={unlimited}
          />
          {RESOURCE_ORDER.map((resource) => (
            <PlanUsageRow
              key={resource}
              label={t(`settings.plan.resource.${resource}`)}
              used={usage.items[resource]}
              limit={plan.maxItemsPerResource}
              unlimitedLabel={unlimited}
            />
          ))}
          <PlanUsageRow
            label={t('settings.plan.usage-exports')}
            used={usage.exportsThisMonth}
            limit={plan.maxExportsPerMonth}
            unlimitedLabel={unlimited}
          />
          <PlanUsageRow
            label={t('settings.plan.usage-imports')}
            used={usage.importsThisMonth}
            limit={plan.maxImportsPerMonth}
            unlimitedLabel={unlimited}
          />
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-medium tracking-tight">
          {t('settings.plan.compare')}
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          {t('settings.plan.change-hint')}
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PUBLIC_PLANS.map((candidate) => (
            <PlanCard
              key={candidate.level}
              plan={candidate}
              current={candidate.level === plan.level}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
