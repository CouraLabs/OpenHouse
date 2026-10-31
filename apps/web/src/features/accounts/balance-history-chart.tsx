import { useTranslation } from 'react-i18next'
import type { BalanceHistory } from '@workspace/dto'
import { ProjectionLineChart } from '@workspace/ui/components/projection-line-chart'

import { compactMoney } from '@/lib/finance.js'
import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

const BALANCE_COLOR = 'var(--chart-1)'

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
