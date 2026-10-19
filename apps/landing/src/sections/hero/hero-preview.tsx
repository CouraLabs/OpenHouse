import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { LimitBar } from '@/components/preview/limit-bar.js'
import { WindowChrome } from '@/components/window-chrome.js'
import { useContent } from '@/lib/use-locale.js'

/**
 * A slice of the app in a window: the account balance and the sample ledger
 * on the left, a rail of two limits on the right (stacked below `md`).
 */
export function HeroPreview() {
  const { hero, sampleLedger, sampleLimits } = useContent()
  return (
    <WindowChrome title={hero.windowTitle}>
      <div className="grid md:grid-cols-[1fr_15rem]">
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">{hero.balance.label}</span>
            <span className="text-ink font-serif text-4xl tracking-[-0.03em] tabular-nums">
              {hero.balance.amount}
            </span>
          </div>
          <LedgerRows days={sampleLedger} />
        </div>
        <aside className="border-line bg-bone/60 flex flex-col gap-5 border-t p-6 md:border-t-0 md:border-l">
          <span className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
            {hero.limitsTitle}
          </span>
          {sampleLimits.map((limit) => (
            <LimitBar key={limit.label} {...limit} />
          ))}
        </aside>
      </div>
    </WindowChrome>
  )
}
