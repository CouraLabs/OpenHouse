import { InitialsTile } from '@/components/preview/initials-tile.js'
import { useContent } from '@/lib/use-locale.js'

export function AccountsVisual() {
  const { sampleAccounts } = useContent()

  return (
    <ul className="flex flex-col">
      {sampleAccounts.map((account) => (
        <li
          key={account.name}
          className="flex items-center justify-between gap-3 py-2"
        >
          <InitialsTile name={account.name} />
          <div className="flex min-w-0 flex-1 flex-col leading-snug">
            <span className="text-ink truncate text-[0.875rem] font-medium">
              {account.name}
            </span>
            <span className="text-xs text-muted">{account.kind}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-ink text-[0.875rem] font-semibold tabular-nums">
              {account.amount}
            </span>
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted">
              {account.currency}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
