import { useContent } from '@/lib/use-locale.js'

export function AccountsVisual() {
  const { sampleAccounts } = useContent()

  return (
    <ul className="divide-line flex flex-col divide-y">
      {sampleAccounts.map((account) => (
        <li
          key={account.name}
          className="flex items-center justify-between gap-4 py-2.5"
        >
          <div className="flex min-w-0 flex-col leading-snug">
            <span className="text-ink truncate text-sm">{account.name}</span>
            <span className="text-xs text-muted">{account.kind}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-ink font-mono text-[13px] tabular-nums">
              {account.amount}
            </span>
            <span className="border-line bg-bone rounded border px-1 font-mono text-[11px] text-muted">
              {account.currency}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
