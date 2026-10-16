import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'

/** One period of the schedule: both capitals, both interest runs, the gap. */
export interface InterestRow {
  period: number
  simpleCapital: number
  simpleInterest: number
  compoundCapital: number
  compoundInterest: number
  variation: number
}

/** The props `InterestTable` takes. */
interface InterestTableProps {
  rows: InterestRow[]
}

/**
 * The full schedule, period by period, in a scrollable table — the chart
 * shows the shape, the table carries every value exactly.
 */
export function InterestTable({ rows }: InterestTableProps) {
  const { t, i18n } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('interest-comparison.table.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {t('interest-comparison.table.period')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('interest-comparison.table.simple-capital')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('interest-comparison.table.simple-interest')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('interest-comparison.table.compound-capital')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('interest-comparison.table.compound-interest')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('interest-comparison.table.variation')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.period} className="border-t">
                  <td className="px-3 py-1.5 tabular-nums">{row.period}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(String(row.simpleCapital), i18n.language)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(String(row.simpleInterest), i18n.language)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(String(row.compoundCapital), i18n.language)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(String(row.compoundInterest), i18n.language)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(String(row.variation), i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
