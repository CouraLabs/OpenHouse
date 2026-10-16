import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'

import type { RentVsBuyResult } from './simulate.js'

/** The props `RentVsBuySummary` takes. */
interface RentVsBuySummaryProps {
  result: RentVsBuyResult
}

/**
 * Where both paths end: the buyer's totals — what went into the property,
 * what went to the bank — beside the renter's totals, the invested
 * difference included. Nothing is compared with a verdict; the numbers
 * carry the trade-off.
 */
export function RentVsBuySummary({ result }: RentVsBuySummaryProps) {
  const { t, i18n } = useTranslation()
  const format = (value: number) => formatMoney(String(value), i18n.language)

  const panels = [
    {
      key: 'buy',
      title: t('rent-vs-buy.buy.title'),
      rows: [
        {
          label: t('rent-vs-buy.buy.amortization'),
          value: result.amortizationTotal,
        },
        { label: t('rent-vs-buy.buy.interest'), value: result.interestTotal },
        { label: t('rent-vs-buy.buy.total'), value: result.paidTotal },
        { label: t('rent-vs-buy.buy.patrimony'), value: result.patrimony },
      ],
    },
    {
      key: 'rent',
      title: t('rent-vs-buy.rent.title'),
      rows: [
        { label: t('rent-vs-buy.rent.rent-total'), value: result.rentTotal },
        { label: t('rent-vs-buy.rent.surplus'), value: result.surplusTotal },
        {
          label: t('rent-vs-buy.rent.investment'),
          value: result.investmentTotal,
        },
      ],
    },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {panels.map((panel) => (
        <Card key={panel.key} className="gap-3">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {panel.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {panel.rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">
                  {format(row.value)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
