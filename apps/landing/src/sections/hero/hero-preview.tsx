import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { LimitBar } from '@/components/preview/limit-bar.js'
import { WindowChrome } from '@/components/window-chrome.js'
import { useContent } from '@/lib/use-locale.js'

export function HeroPreview() {
  const { hero, sampleLedger, sampleLimits } = useContent()
  return (
    <WindowChrome title={hero.windowTitle}>
      <div className="grid md:grid-cols-[1fr_15rem]">
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">{hero.balance.label}</span>
            <span className="text-ink font-display text-4xl font-medium tracking-[-0.045em] tabular-nums">
              {hero.balance.amount}
            </span>
          </div>
          <LedgerRows days={sampleLedger} />
        </div>
        <aside className="border-line bg-bone/60 flex flex-col gap-5 border-t p-6 md:border-t-0 md:border-l">
          <span className="font-mono text-[0.74rem] tracking-[0.05em] text-muted uppercase">
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
