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

  return (
    <div className="grid grid-cols-[minmax(0,22rem)_1fr] gap-6 surface-card p-3">
      <div
        role="tablist"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="flex flex-col gap-1"
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
                'rounded-2xl px-4 py-3 text-left transition-colors duration-150 ease-(--ease-out-expo)',
                active
                  ? 'bg-action-soft text-action'
                  : 'text-ink hover:bg-surface-2'
              )}
            >
              <span className="text-[0.9375rem] leading-snug font-medium text-pretty">
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
        className="rounded-2xl bg-surface-2 p-8 lg:p-10"
      >
        <div
          key={selected}
          className="faq-panel flex max-w-[62ch] flex-col gap-5"
        >
          <h3 className="text-ink text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance">
            {current.question}
          </h3>
          <p className="text-body text-[1.0625rem] text-pretty">
            {current.answer}
          </p>
        </div>
      </div>
    </div>
  )
}
