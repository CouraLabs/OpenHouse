import { cn } from 'cn'

import type { LedgerRow } from '@/lib/content.js'

/**
 * A sample ledger grouped by day, as the transactions page lays it out: a
 * monospace day label, then each row's description, category, and signed
 * amount. Income reads in the pale-green ink.
 */
export function LedgerRows({
  days,
}: {
  days: { day: string; rows: LedgerRow[] }[]
}) {
  return (
    <div className="flex flex-col gap-5">
      {days.map((group) => (
        <div key={group.day} className="flex flex-col">
          <span className="pb-1 font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
            {group.day}
          </span>
          <ul className="divide-line flex flex-col divide-y">
            {group.rows.map((row) => (
              <li
                key={row.description}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <div className="flex min-w-0 flex-col leading-snug">
                  <span className="text-ink truncate text-sm">
                    {row.description}
                  </span>
                  <span className="text-xs text-muted">{row.category}</span>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[13px] tabular-nums',
                    row.income ? 'text-green-ink' : 'text-ink'
                  )}
                >
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
