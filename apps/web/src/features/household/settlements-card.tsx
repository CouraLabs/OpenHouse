import { useTranslation } from 'react-i18next'
import type { SettlementEntry } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'

/** The history of recorded settle-ups, newest first. */
export function SettlementsCard({
  settlements,
}: {
  settlements: SettlementEntry[]
}) {
  const { t, i18n } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('household.history')}</CardTitle>
      </CardHeader>
      <CardContent>
        {settlements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('household.history-empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {settlements.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {t('household.history-line', {
                    date: entry.transactionDt,
                    from: entry.fromName,
                    to: entry.toName,
                  })}
                </span>
                <span className="tabular-nums">
                  {formatMoney(entry.amount, i18n.language, entry.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
