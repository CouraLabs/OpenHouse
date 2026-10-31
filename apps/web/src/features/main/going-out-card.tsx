import { Link } from '@tanstack/react-router'
import { CalendarCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_UPCOMING_DAYS, type UpcomingResponse } from '@workspace/dto'

import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
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

import { UpcomingGroupedList } from '@/features/upcoming/upcoming-grouped-list.js'

const HOME_ITEMS = 8

export function GoingOutCard({
  upcoming,
  isError,
}: {
  upcoming: UpcomingResponse | undefined
  isError: boolean
}) {
  const { t } = useTranslation()
  const items = (upcoming?.items ?? [])
    .filter((item) => item.kind === 'bill' || item.kind === 'recurring')
    .slice(0, HOME_ITEMS)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.soon-title')}</CardTitle>
        <CardDescription>
          {t('home.soon-subtitle', { days: DEFAULT_UPCOMING_DAYS })}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/upcoming" />}
          >
            {t('main.see-all')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {upcoming === undefined ? (
          isError ? (
            <p className="text-sm text-negative">{t('upcoming.error')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )
        ) : items.length === 0 ? (
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
          <UpcomingGroupedList items={items} today={upcoming.from} />
        )}
      </CardContent>
    </Card>
  )
}
