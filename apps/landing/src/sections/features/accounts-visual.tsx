/** The sample accounts the card lists, one per currency. */
const ACCOUNTS = [
  {
    name: 'Main Street Checking',
    kind: 'Bank',
    amount: '$8,412.36',
    currency: 'USD',
  },
  {
    name: 'Nubank Mastercard',
    kind: 'Card · due Nov 10',
    amount: 'R$ 1.208,90',
    currency: 'BRL',
  },
  {
    name: 'Lisbon Savings',
    kind: 'Bank',
    amount: '€2,340.00',
    currency: 'EUR',
  },
]

/** Three accounts in three currencies, each with its balance. */
export function AccountsVisual() {
  return (
    <ul className="divide-line flex flex-col divide-y">
      {ACCOUNTS.map((account) => (
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
            <span className="border-line bg-bone rounded border px-1 font-mono text-[10px] text-muted">
              {account.currency}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
