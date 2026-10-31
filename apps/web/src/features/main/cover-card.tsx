import { Link } from '@tanstack/react-router'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UpcomingResponse } from '@workspace/dto'

import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { ForecastChart } from '@workspace/ui/components/forecast-chart'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useMainCurrency } from '@/lib/settings.js'

export function CoverCard({
  upcoming,
  isError,
}: {
  upcoming: UpcomingResponse | undefined
  isError: boolean
}) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const locale = formattingLocale()
  const line = upcoming?.balances.find(
    (candidate) =>
      candidate.accountId === null && candidate.currency === mainCurrency
  )
  const raw =
    line === undefined || upcoming === undefined
      ? []
      : [
          ...(line.points[0]?.date === upcoming.from
            ? []
            : [{ date: upcoming.from, balance: line.startBalance }]),
          ...line.points,
          ...(line.points.at(-1)?.date === upcoming.to
            ? []
            : [{ date: upcoming.to, balance: line.endBalance }]),
        ]
  const points = raw.map((point, index, all) => ({
    label: formatDayLabel(point.date, locale),
    value: Number(point.balance),
    step: index > 0 && point.balance !== all[index - 1]?.balance,
  }))
  const hasSteps = points.some((point) => point.step)
  const compact = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: mainCurrency,
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.cover-title')}</CardTitle>
        <CardDescription>
          {t('home.cover-subtitle', { currency: mainCurrency })}
        </CardDescription>
        <CardAction className="max-sm:hidden">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/upcoming" />}
          >
            {t('home.cover-open')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-4">
        {upcoming === undefined ? (
          isError ? (
            <p className="text-sm text-negative">{t('upcoming.error')}</p>
          ) : (
            <Skeleton className="h-60 w-full" />
          )
        ) : line === undefined || points.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t('home.cover-empty')}
          </p>
        ) : !hasSteps ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface-2 p-6">
            <span className="flex size-10 items-center justify-center rounded-full bg-card text-positive shadow-soft">
              <CircleCheck aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-[0.9375rem] font-semibold">
                {t('home.cover-steady-title', {
                  date: formatDayLabel(upcoming.to, locale),
                })}
              </p>
              <p className="text-[0.875rem] text-muted-foreground">
                {t('home.cover-steady-body', {
                  amount: formatMoney(line.endBalance, locale, line.currency),
                })}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ForecastChart
              points={points}
              seriesLabel={t('home.cover-series')}
              formatValue={(value) =>
                formatMoney(String(value), locale, mainCurrency)
              }
              formatTick={(value) => compact.format(value)}
              ariaLabel={t('home.cover-aria', {
                start: formatMoney(line.startBalance, locale, line.currency),
                end: formatMoney(line.endBalance, locale, line.currency),
              })}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {line.firstNegative === null ? (
                <p className="flex items-center gap-2 text-[0.875rem] text-muted-foreground">
                  <CircleCheck aria-hidden className="size-4 text-positive" />
                  {t('home.cover-ok', {
                    date: formatDayLabel(upcoming.to, locale),
                    amount: formatMoney(line.endBalance, locale, line.currency),
                  })}
                </p>
              ) : (
                <p className="flex items-center gap-2 text-[0.875rem] text-negative">
                  <TriangleAlert aria-hidden className="size-4" />
                  {t('home.cover-short', {
                    date: formatDayLabel(line.firstNegative.date, locale),
                    amount: formatMoney(
                      line.firstNegative.balance,
                      locale,
                      line.currency
                    ),
                  })}
                </p>
              )}
              <ul className="flex items-center gap-4 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-0 w-3.5 border-t-2 border-dashed border-primary"
                  />
                  {t('home.cover-legend-line')}
                </li>
                <li className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 rounded-full border-[1.75px] border-data-orange"
                  />
                  {t('home.cover-legend-step')}
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
