import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { sampleLedger } from '@/lib/content.js'

/** The month's money in and out across the sample ledger. */
const TOTALS = [
  { label: 'In', amount: '+$4,200.00', income: true },
  { label: 'Out', amount: '−$1,646.20', income: false },
]

/**
 * The sample ledger with the month's totals pinned beneath it, so the tall
 * card ends on a summary instead of empty space.
 */
export function TransactionsVisual() {
  return (
    <div className="flex grow flex-col justify-between gap-8">
      <LedgerRows days={sampleLedger} />
      <div className="border-line bg-line grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
        {TOTALS.map((total) => (
          <div key={total.label} className="bg-bone flex flex-col px-4 py-3">
            <span className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
              October · {total.label}
            </span>
            <span
              className={
                total.income
                  ? 'text-green-ink font-mono text-sm tabular-nums'
                  : 'text-ink font-mono text-sm tabular-nums'
              }
            >
              {total.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
