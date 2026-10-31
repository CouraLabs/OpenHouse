import { Link } from '@tanstack/react-router'
import { CalendarClock, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_UPCOMING_DAYS } from '@workspace/dto'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { UpcomingItemRow } from './upcoming-item-row.js'
import { useUpcoming } from './use-upcoming.js'
import { formattingLocale } from '@/lib/i18n.js'

const CARD_ITEMS = 5

export function UpcomingCard() {
  const { t } = useTranslation()
  const upcoming = useUpcoming(DEFAULT_UPCOMING_DAYS)
  const negatives =
    upcoming.data?.balances.filter(
      (line) => line.firstNegative !== null && line.accountId !== null
    ) ?? []
  const items = upcoming.data?.items.slice(0, CARD_ITEMS) ?? []

  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarClock aria-hidden className="size-4" />
          {t('upcoming.card-title')}
        </CardTitle>
        <Link
          to="/upcoming"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {t('upcoming.see-all')}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {upcoming.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : upcoming.isError ? (
          <p className="text-sm text-destructive">{t('upcoming.error')}</p>
        ) : (
          <>
            {negatives.map((line) =>
              line.firstNegative === null ? null : (
                <p
                  key={`${line.currency}-${line.accountId}`}
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  <TriangleAlert aria-hidden className="size-4 shrink-0" />
                  {t(
                    line.firstNegative.date === upcoming.data.from
                      ? 'upcoming.negative-today'
                      : 'upcoming.negative',
                    {
                      name: line.accountName,
                      date: formatDayLabel(
                        line.firstNegative.date,
                        formattingLocale()
                      ),
                      amount: formatMoney(
                        line.firstNegative.balance,
                        formattingLocale(),
                        line.currency
                      ),
                    }
                  )}
                </p>
              )
            )}
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('upcoming.empty', { days: DEFAULT_UPCOMING_DAYS })}
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {items.map((item) => (
                  <UpcomingItemRow key={item.key} item={item} />
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
