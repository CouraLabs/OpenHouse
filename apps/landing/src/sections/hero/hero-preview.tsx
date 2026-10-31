import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDots,
  Gauge,
  House,
  MagnifyingGlass,
  Plus,
  Receipt,
  Swap,
  Wallet,
  type Icon,
} from '@phosphor-icons/react'
import { cn } from 'cn'

import { LedgerRows } from '@/components/preview/ledger-rows.js'
import { LimitBar } from '@/components/preview/limit-bar.js'
import { LogoTile } from '@/components/logo-tile.js'
import { Wordmark } from '@/components/wordmark.js'
import type { HeroKpi } from '@/lib/content.js'
import { useContent } from '@/lib/use-locale.js'

const NAV_ICONS: Icon[] = [House, Swap, CalendarDots, Receipt, Gauge]

const KPI_STYLE: Record<HeroKpi['tone'], { icon: Icon; tile: string }> = {
  primary: { icon: Wallet, tile: 'bg-action-soft text-action' },
  in: {
    icon: ArrowDownLeft,
    tile: 'bg-[color-mix(in_oklab,var(--data-in)_20%,transparent)] text-[color-mix(in_oklab,var(--data-in)_62%,var(--ink))]',
  },
  out: {
    icon: ArrowUpRight,
    tile: 'bg-[color-mix(in_oklab,var(--data-out)_24%,transparent)] text-[color-mix(in_oklab,var(--data-out)_58%,var(--ink))]',
  },
}

export function HeroPreview() {
  const { hero, sampleLimits } = useContent()
  const preview = hero.preview

  return (
    <figure
      aria-label={preview.label}
      className="relative rounded-[1.75rem] bg-[color-mix(in_oklab,var(--canvas)_88%,var(--action-soft))] p-2.5 shadow-(--shadow-lift) ring-1 ring-(--line) sm:p-3"
    >
      <div className="flex gap-3">
        <aside className="bg-chrome text-chrome-ink hidden w-40 shrink-0 flex-col gap-4 rounded-[1.25rem] p-3 sm:flex">
          <div className="flex items-center gap-2 px-1 pt-1">
            <LogoTile />
            <div className="flex min-w-0 flex-col leading-tight">
              <Wordmark className="text-chrome-ink text-[0.9375rem]" />
              <span className="text-chrome-muted truncate text-[0.6875rem]">
                {preview.home}
              </span>
            </div>
          </div>
          <span className="text-chrome-muted px-2 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            {preview.section}
          </span>
          <ul className="flex flex-col gap-0.5">
            {preview.nav.map((item, index) => {
              const Glyph = NAV_ICONS[index] ?? House
              return (
                <li
                  key={item}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-full px-2.5 text-[0.75rem]',
                    index === 0
                      ? 'bg-chrome-active font-semibold text-[#0f1f18]'
                      : 'text-chrome-ink/80'
                  )}
                >
                  <Glyph aria-hidden size={15} />
                  {item}
                </li>
              )
            })}
          </ul>
          <div className="mt-auto flex flex-col gap-1.5 rounded-xl bg-white/[0.06] p-2.5 ring-1 ring-white/[0.07]">
            <span className="text-chrome-muted text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {preview.monthLabel}
            </span>
            <span className="text-[0.8125rem] font-semibold tabular-nums">
              {preview.monthValue}
            </span>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-3 py-1 pr-1">
          <div className="flex items-center gap-2">
            <span className="bg-surface flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full px-3 text-[0.75rem] text-muted shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <MagnifyingGlass aria-hidden size={14} />
              <span className="truncate">{preview.search}</span>
              <span className="border-line-2 ml-auto rounded-md border px-1 text-[0.6875rem] max-sm:hidden">
                ⌘K
              </span>
            </span>
            <span className="bg-surface text-ink relative flex size-8 items-center justify-center rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <Bell aria-hidden size={14} />
              <span className="ring-surface absolute top-1.5 right-2 size-1.5 rounded-full bg-(--data-orange) ring-2" />
            </span>
            <span className="bg-action text-on-action flex h-8 items-center gap-1 rounded-full px-3 text-[0.75rem] font-medium shadow-(--shadow-glow)">
              <Plus aria-hidden size={13} weight="bold" />
              {preview.newTransaction}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 px-1 pt-1">
            <div className="flex flex-col">
              <span className="text-[0.6875rem] text-muted">
                {preview.date}
              </span>
              <span className="text-ink text-[1.5rem] leading-tight font-bold tracking-[-0.025em]">
                {preview.title}
              </span>
            </div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.6875rem] font-medium text-muted">
              {preview.example}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-sm:[&>*:nth-child(3)]:hidden">
            {preview.kpis.map((kpi) => {
              const style = KPI_STYLE[kpi.tone]
              const Glyph = style.icon
              return (
                <div
                  key={kpi.label}
                  className="bg-surface flex min-w-0 flex-col gap-2 rounded-2xl p-3 shadow-(--shadow-soft)"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-md',
                        style.tile
                      )}
                    >
                      <Glyph aria-hidden size={12} />
                    </span>
                    <span className="min-w-0 text-[0.6875rem] leading-tight text-muted">
                      {kpi.label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'truncate text-[clamp(0.8125rem,1.5vw,1.125rem)] leading-none font-bold tracking-[-0.02em] tabular-nums',
                      kpi.tone === 'in' ? 'text-positive' : 'text-ink'
                    )}
                  >
                    {kpi.value}
                  </span>
                  <span className="truncate text-[0.6875rem] text-muted">
                    {kpi.note}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="bg-surface flex min-w-0 flex-col gap-3 rounded-2xl p-4 shadow-(--shadow-soft)">
              <div className="flex flex-col">
                <span className="text-ink text-[0.875rem] font-semibold">
                  {preview.soonTitle}
                </span>
                <span className="text-[0.6875rem] text-muted">
                  {preview.soonSubtitle}
                </span>
              </div>
              <LedgerRows days={preview.soon} />
            </div>
            <div className="bg-surface flex min-w-0 flex-col gap-3 rounded-2xl p-4 shadow-(--shadow-soft) max-xl:hidden">
              <span className="text-ink text-[0.875rem] font-semibold">
                {hero.limitsTitle}
              </span>
              {sampleLimits.map((limit) => (
                <LimitBar key={limit.label} {...limit} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  )
}
