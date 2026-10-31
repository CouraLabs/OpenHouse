import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ProjectedBalance, UpcomingResponse } from '@workspace/dto'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { cn } from 'cn'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

function isCurrencyLine(line: ProjectedBalance): boolean {
  return line.accountId === null
}

export function ProjectedBalances({
  balances,
  from,
  to,
}: {
  balances: UpcomingResponse['balances']
  from: string
  to: string
}) {
  const { t } = useTranslation()

  if (balances.length === 0) {
    return null
  }

  const money = (line: ProjectedBalance, amount: string) =>
    formatMoney(amount, formattingLocale(), line.currency)

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{t('upcoming.balances-title')}</CardTitle>
        <CardDescription>
          {t('upcoming.balances', {
            from: formatDayLabel(from, formattingLocale()),
            to: formatDayLabel(to, formattingLocale()),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <ul className="flex flex-col gap-1">
          {balances.map((line) => (
            <li
              key={`${line.currency}-${line.accountId ?? 'total'}`}
              className={cn(
                'flex flex-col gap-1.5 rounded-2xl px-3 py-2.5',
                isCurrencyLine(line) && 'bg-surface-2'
              )}
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={isCurrencyLine(line) ? 'font-medium' : ''}>
                  {line.accountName ??
                    t('upcoming.currency-total', { currency: line.currency })}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">
                    {money(line, line.startBalance)}
                  </span>
                  <span aria-hidden>→</span>
                  <span className="font-medium">
                    {money(line, line.endBalance)}
                  </span>
                </span>
              </div>
              {line.firstNegative !== null ? (
                <p className="flex items-center gap-2 text-[0.8125rem] text-negative">
                  <TriangleAlert aria-hidden className="size-4 shrink-0" />
                  {t(
                    `upcoming.negative${line.accountId === null ? '-currency' : ''}${line.firstNegative.date === from ? '-today' : ''}`,
                    {
                      currency: line.currency,
                      name:
                        line.accountName ??
                        t('upcoming.currency-total', {
                          currency: line.currency,
                        }),
                      date: formatDayLabel(
                        line.firstNegative.date,
                        formattingLocale()
                      ),
                      amount: money(line, line.firstNegative.balance),
                    }
                  )}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {t('upcoming.balances-note', {
            to: formatDayLabel(to, formattingLocale()),
          })}
        </p>
      </CardContent>
    </Card>
  )
}
