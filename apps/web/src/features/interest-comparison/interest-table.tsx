import { useTranslation } from 'react-i18next'

import type { InterestRow } from '@workspace/dto'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'
import { formattingLocale } from '@/lib/i18n.js'

interface InterestTableProps {
  rows: InterestRow[]
}

export function InterestTable({ rows }: InterestTableProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()

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
                    {formatMoney(
                      String(row.simpleCapital),
                      formattingLocale(),
                      mainCurrency
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(
                      String(row.simpleInterest),
                      formattingLocale(),
                      mainCurrency
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(
                      String(row.compoundCapital),
                      formattingLocale(),
                      mainCurrency
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(
                      String(row.compoundInterest),
                      formattingLocale(),
                      mainCurrency
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(
                      String(row.variation),
                      formattingLocale(),
                      mainCurrency
                    )}
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
