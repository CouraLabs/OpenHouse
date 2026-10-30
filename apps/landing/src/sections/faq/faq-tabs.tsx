import { type KeyboardEvent, useId, useRef, useState } from 'react'
import { cn } from 'cn'

import type { Question } from '@/lib/content.js'

export function FaqTabs({ items }: { items: Question[] }) {
  const [selected, setSelected] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()
  const tabId = (index: number) => `${baseId}-tab-${index}`
  const panelId = `${baseId}-panel`

  const select = (index: number) => {
    setSelected(index)
    tabs.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const last = items.length - 1
    const next = {
      ArrowDown: selected === last ? 0 : selected + 1,
      ArrowUp: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    select(next)
  }

  const current = items[selected]
  const counter = (index: number) => String(index + 1).padStart(2, '0')

  return (
    <div className="grid grid-cols-[var(--split)_1fr]">
      <div
        role="tablist"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="divide-line flex flex-col divide-y"
      >
        {items.map((item, index) => {
          const active = index === selected
          return (
            <button
              key={item.question}
              ref={(node) => {
                tabs.current[index] = node
              }}
              id={tabId(index)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              className={cn(
                'grid grid-cols-[2rem_1fr] items-baseline gap-3 py-4 pr-6 pl-(--pad) text-left transition-colors duration-200 ease-(--ease-out-expo)',
                active ? 'bg-ink text-on-ink' : 'text-ink hover:bg-surface'
              )}
            >
              <span
                className={cn(
                  'font-mono text-[0.78rem] tabular-nums',
                  active ? 'opacity-70' : 'text-muted'
                )}
              >
                {counter(index)}
              </span>
              <span className="text-[1rem] leading-snug font-medium text-pretty">
                {item.question}
              </span>
            </button>
          )
        })}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(selected)}
        className="split-rule p-(--pad) pt-10"
      >
        <div
          key={selected}
          className="faq-panel flex max-w-[62ch] flex-col gap-5"
        >
          <span className="font-mono text-[0.78rem] text-muted tabular-nums">
            {counter(selected)} / {String(items.length).padStart(2, '0')}
          </span>
          <h3 className="text-ink font-display text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.1] font-medium tracking-[-0.035em] text-balance">
            {current.question}
          </h3>
          <p className="text-body text-[1.1rem] text-pretty">
            {current.answer}
          </p>
        </div>
      </div>
    </div>
  )
}
