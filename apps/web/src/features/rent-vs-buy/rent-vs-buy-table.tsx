import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'

import type { RentVsBuyRow } from './simulate.js'

/** The props `RentVsBuyTable` takes. */
interface RentVsBuyTableProps {
  rows: RentVsBuyRow[]
}

/**
 * The financing schedule, month by month, in a scrollable table — the
 * balance, the installment, and the property the equity sits in.
 */
export function RentVsBuyTable({ rows }: RentVsBuyTableProps) {
  const { t, i18n } = useTranslation()
  const mainCurrency = useMainCurrency()
  const format = (value: number) =>
    formatMoney(String(value), i18n.language, mainCurrency)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('rent-vs-buy.table.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {t('rent-vs-buy.table.month')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('rent-vs-buy.table.balance')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('rent-vs-buy.table.payment')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('rent-vs-buy.table.amortization')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('rent-vs-buy.table.interest')}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t('rent-vs-buy.table.property')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-t">
                  <td className="px-3 py-1.5 tabular-nums">{row.month}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {format(row.balance)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {format(row.payment)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {format(row.amortization)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {format(row.interest)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {format(row.propertyValue)}
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
