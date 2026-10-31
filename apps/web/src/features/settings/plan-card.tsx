import { Check, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TierPlan } from '@workspace/dto'
import { cn } from 'cn'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

interface PlanCardProps {
  plan: TierPlan
  current: boolean
}

export function PlanCard({ plan, current }: PlanCardProps) {
  const { t } = useTranslation()
  const limit = (value: number | null) =>
    value === null ? t('settings.plan.unlimited') : String(value)
  const features: Array<{ label: string; included: boolean }> = [
    {
      label: t('settings.plan.feature-users', {
        count: plan.maxUsers ?? 0,
        value: limit(plan.maxUsers),
      }),
      included: true,
    },
    {
      label: t('settings.plan.feature-items', {
        value: limit(plan.maxItemsPerResource),
      }),
      included: true,
    },
    {
      label: t('settings.plan.feature-exports', {
        exports: limit(plan.maxExportsPerMonth),
        imports: limit(plan.maxImportsPerMonth),
      }),
      included: true,
    },
    {
      label:
        plan.transactionMonths === null
          ? t('settings.plan.feature-history-unlimited')
          : t('settings.plan.feature-history', {
              count: plan.transactionMonths,
            }),
      included: true,
    },
    {
      label: t('settings.plan.feature-messaging'),
      included: plan.messagingIntegration,
    },
    {
      label: t('settings.plan.feature-sessions'),
      included: plan.multipleSessions,
    },
    { label: t('settings.plan.feature-ai'), included: plan.ai !== 'none' },
    {
      label: t('settings.plan.feature-assistant'),
      included: plan.householdAssistant,
    },
  ]

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/[0.06]',
        current && 'ring-2 ring-primary/40'
      )}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-lg font-normal tracking-tight">
            {plan.name}
          </h3>
          {current && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/15">
              {t('settings.plan.current')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t('settings.plan.price', {
            price: formatMoney(
              plan.monthlyPrice,
              formattingLocale(),
              plan.currency
            ),
          })}
          {plan.extraUserPrice !== null &&
            ` · ${t('settings.plan.extra-user', {
              price: formatMoney(
                plan.extraUserPrice,
                formattingLocale(),
                plan.currency
              ),
            })}`}
        </p>
      </header>
      <ul className="flex flex-col gap-2 text-sm">
        {features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              'flex items-start gap-2',
              !feature.included && 'text-muted-foreground'
            )}
          >
            {feature.included ? (
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <Minus className="mt-0.5 size-4 shrink-0" />
            )}
            {feature.label}
          </li>
        ))}
      </ul>
    </article>
  )
}
