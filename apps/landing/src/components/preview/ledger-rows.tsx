import { cn } from 'cn'

import type { LedgerRow } from '@/lib/content.js'

import { InitialsTile } from './initials-tile.js'

export function LedgerRows({
  days,
}: {
  days: { day: string; rows: LedgerRow[] }[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {days.map((group) => (
        <div key={group.day} className="flex flex-col gap-1">
          <span className="label-caps">{group.day}</span>
          <ul className="flex flex-col">
            {group.rows.map((row) => (
              <li
                key={row.description}
                className="flex items-center justify-between gap-3 py-2"
              >
                <InitialsTile name={row.description} />
                <div className="flex min-w-0 flex-1 flex-col leading-snug">
                  <span className="text-ink truncate text-[0.875rem] font-medium">
                    {row.description}
                  </span>
                  <span className="text-xs text-muted">{row.category}</span>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-[0.875rem] font-semibold tabular-nums',
                    row.income ? 'text-positive' : 'text-ink'
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
