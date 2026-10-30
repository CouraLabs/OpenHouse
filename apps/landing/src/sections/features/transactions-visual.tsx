import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { useContent } from '@/lib/use-locale.js'

export function TransactionsVisual() {
  const { sampleLedger, sampleTotals } = useContent()
  return (
    <div className="flex grow flex-col justify-between gap-8">
      <LedgerRows days={sampleLedger} />
      <div className="border-line bg-line grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
        {sampleTotals.map((total) => (
          <div key={total.label} className="bg-bone flex flex-col px-4 py-3">
            <span className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
              {total.label}
            </span>
            <span className="text-ink font-mono text-sm tabular-nums">
              {total.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
