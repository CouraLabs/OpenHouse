import { useTranslation } from 'react-i18next'
import {
  compareMoney,
  type HouseholdBalance,
  type SettleSuggestion,
} from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The props `BalancesCard` takes. */
interface BalancesCardProps {
  balances: HouseholdBalance[]
  suggestions: SettleSuggestion[]
  onSettle: (suggestion: SettleSuggestion) => void
}

/**
 * Who is owed and who owes, per currency, and the fewest payments that
 * clear it. A suggestion carries its settle action; a removed member's
 * balance stays listed and settleable.
 */
export function BalancesCard({
  balances,
  suggestions,
  onSettle,
}: BalancesCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('household.balances')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('household.balances-empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {balances.map((row) => (
              <li
                key={`${row.userId}-${row.currency}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  {row.userName}
                  {!row.isActive ? (
                    <Badge variant="outline">{t('household.removed')}</Badge>
                  ) : null}
                </span>
                <span
                  className={
                    compareMoney(row.balance, '0') < 0
                      ? 'text-destructive tabular-nums'
                      : 'tabular-nums'
                  }
                >
                  {formatMoney(row.balance, formattingLocale(), row.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('household.suggestions')}</p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('household.all-settled')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.currency}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {t('household.suggestion', {
                      from: suggestion.fromName,
                      to: suggestion.toName,
                      amount: formatMoney(
                        suggestion.amount,
                        formattingLocale(),
                        suggestion.currency
                      ),
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSettle(suggestion)}
                  >
                    {t('household.settle')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
