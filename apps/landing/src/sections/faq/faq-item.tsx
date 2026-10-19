import { useId, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'

import type { Question } from '@/lib/content.js'

/** One question: a ruled row that opens to its answer, `+` and `-` marking state. */
export function FaqItem({ item }: { item: Question }) {
  const [open, setOpen] = useState(false)
  const answerId = useId()

  return (
    <li className="border-line border-b">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((value) => !value)}
        className="text-ink flex w-full items-center justify-between gap-6 py-5 text-left text-base"
      >
        {item.question}
        {open ? (
          <Minus aria-hidden className="shrink-0 text-muted" />
        ) : (
          <Plus aria-hidden className="shrink-0 text-muted" />
        )}
      </button>
      <p
        id={answerId}
        hidden={!open}
        className="max-w-2xl pb-6 text-sm text-pretty text-muted"
      >
        {item.answer}
      </p>
    </li>
  )
}
