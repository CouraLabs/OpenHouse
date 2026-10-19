import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { LimitBar } from '@/components/preview/limit-bar.js'
import { WindowChrome } from '@/components/window-chrome.js'
import { hero, sampleLedger } from '@/lib/content.js'

/**
 * A slice of the app in a window: the account balance and the sample ledger
 * on the left, a rail of two limits on the right (stacked below `md`).
 */
export function HeroPreview() {
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
            Limits · October
          </span>
          <LimitBar label="Groceries" spent="$486" cap="$600" percent={81} />
          <LimitBar label="Transport" spent="$94" cap="$250" percent={38} />
          <LimitBar label="Dining out" spent="$132" cap="$300" percent={44} />
        </aside>
      </div>
    </WindowChrome>
  )
}
