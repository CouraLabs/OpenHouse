import { CalendarCheck } from 'lucide-react'
import { DEFAULT_UPCOMING_DAYS } from '@workspace/dto'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { PageHeader } from '@/components/page-header.js'
import { ProjectedBalances } from './projected-balances.js'
import { UpcomingGroupedList } from './upcoming-grouped-list.js'
import { useUpcoming } from './use-upcoming.js'

export function UpcomingPage() {
  const { t } = useTranslation()
  const upcoming = useUpcoming(DEFAULT_UPCOMING_DAYS)

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('upcoming.title')}
        subtitle={t('upcoming.subtitle', { days: DEFAULT_UPCOMING_DAYS })}
      />
      {upcoming.isPending ? (
        <Skeleton className="h-64 w-full rounded-[1.25rem]" />
      ) : upcoming.isError ? (
        <p className="text-sm text-negative">{t('upcoming.error')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{t('upcoming.list-title')}</CardTitle>
              <CardDescription>
                {t('upcoming.list-subtitle', { days: DEFAULT_UPCOMING_DAYS })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.data.items.length === 0 ? (
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarCheck />
                    </EmptyMedia>
                    <EmptyTitle>{t('home.soon-empty-title')}</EmptyTitle>
                    <EmptyDescription>
                      {t('upcoming.empty', { days: DEFAULT_UPCOMING_DAYS })}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <UpcomingGroupedList
                  items={upcoming.data.items}
                  today={upcoming.data.from}
                />
              )}
            </CardContent>
          </Card>
          <ProjectedBalances
            balances={upcoming.data.balances}
            from={upcoming.data.from}
            to={upcoming.data.to}
          />
        </div>
      )}
    </main>
  )
}
