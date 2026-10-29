import { useId, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'

import type { Question } from '@/lib/content.js'

/**
 * One question as a ledger row: a mono index, the question, and a round
 * hairline tool marking state; the row lifts one ground step on hover and
 * opens to its answer under the question.
 */
export function FaqItem({ item, index }: { item: Question; index: number }) {
  const [open, setOpen] = useState(false)
  const answerId = useId()

  return (
    <li className="border-line border-b last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((value) => !value)}
        className="group text-ink hover:bg-surface grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 px-(--pad) py-5 text-left transition-colors duration-200"
      >
        <span className="font-mono text-[0.78rem] text-muted tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-[1.05rem] font-medium text-pretty">
          {item.question}
        </span>
        <span className="ring-line-2 group-hover:bg-ink group-hover:text-on-ink inline-flex size-[34px] items-center justify-center rounded-full ring-1 transition-colors duration-200 ring-inset">
          {open ? <Minus aria-hidden /> : <Plus aria-hidden />}
        </span>
      </button>
      <p
        id={answerId}
        hidden={!open}
        className="text-body max-w-[62ch] px-(--pad) pb-6 pl-[calc(var(--pad)+2.5rem+1rem)] text-[1rem] text-pretty"
      >
        {item.answer}
      </p>
    </li>
  )
}
