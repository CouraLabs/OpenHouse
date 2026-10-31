import { cn } from 'cn'

import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { useContent } from '@/lib/use-locale.js'

export function TransactionsVisual() {
  const { sampleLedger, sampleTotals } = useContent()
  return (
    <div className="flex grow flex-col justify-between gap-8">
      <LedgerRows days={sampleLedger} />
      <div className="grid grid-cols-2 gap-2">
        {sampleTotals.map((total) => (
          <div
            key={total.label}
            className="flex flex-col gap-1 rounded-2xl bg-surface-2 px-4 py-3"
          >
            <span className="label-caps">{total.label}</span>
            <span
              className={cn(
                'text-[1.125rem] font-bold tracking-[-0.02em] tabular-nums',
                total.income ? 'text-positive' : 'text-ink'
              )}
            >
              {total.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
