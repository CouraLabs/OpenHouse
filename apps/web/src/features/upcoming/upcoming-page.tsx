import { DEFAULT_UPCOMING_DAYS } from '@workspace/poco'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { PageHeader } from '@/components/page-header.js'
import { ProjectedBalances } from './projected-balances.js'
import { UpcomingItemRow } from './upcoming-item-row.js'
import { useUpcoming } from './use-upcoming.js'

/**
 * The Upcoming page: the projected balance of each account for the next
 * 30 days, and everything coming due in chronological order — card bills,
 * recurring rules, limits near their cap, goals behind pace.
 */
export function UpcomingPage() {
  const { t } = useTranslation()
  const upcoming = useUpcoming(DEFAULT_UPCOMING_DAYS)

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('upcoming.title')}
        subtitle={t('upcoming.subtitle', { days: DEFAULT_UPCOMING_DAYS })}
      />
      {upcoming.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : upcoming.isError ? (
        <p className="text-sm text-destructive">{t('upcoming.error')}</p>
      ) : (
        <>
          <ProjectedBalances
            balances={upcoming.data.balances}
            from={upcoming.data.from}
            to={upcoming.data.to}
          />
          {upcoming.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('upcoming.empty', { days: DEFAULT_UPCOMING_DAYS })}
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {upcoming.data.items.map((item) => (
                <UpcomingItemRow key={item.key} item={item} />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
