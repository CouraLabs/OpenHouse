import { useTranslation } from 'react-i18next'
import type { BalanceHistory } from '@workspace/poco'
import { ProjectionLineChart } from '@workspace/ui/components/projection-line-chart'

import { compactMoney } from '@/lib/finance.js'
import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The series color: the validated categorical palette's first slot. */
const BALANCE_COLOR = '#2a78d6'

/**
 * An account's end-of-day balance over a range, one point a day. The balance
 * is a decimal string on the wire; the chart plots its number only for the
 * line's height — the tooltip and axis format the exact string's currency.
 */
export function BalanceHistoryChart({ history }: { history: BalanceHistory }) {
  const { t } = useTranslation()

  return (
    <ProjectionLineChart
      ariaLabel={t('accounts.history-chart-label')}
      xLabels={history.points.map((point) =>
        formatDayLabel(point.date, formattingLocale())
      )}
      series={[
        {
          key: 'balance',
          label: t('accounts.balance'),
          color: BALANCE_COLOR,
          values: history.points.map((point) => Number(point.balance)),
        },
      ]}
      formatValue={(value) =>
        formatMoney(value.toFixed(2), formattingLocale(), history.currency)
      }
      formatTick={compactMoney(formattingLocale(), history.currency)}
    />
  )
}
