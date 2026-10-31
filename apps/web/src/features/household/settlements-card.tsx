import { useTranslation } from 'react-i18next'
import type { SettlementEntry } from '@workspace/dto'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

export function SettlementsCard({
  settlements,
}: {
  settlements: SettlementEntry[]
}) {
  const { t } = useTranslation()

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
                  {formatMoney(
                    entry.amount,
                    formattingLocale(),
                    entry.currency
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
