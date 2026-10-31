import { useId, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'

import type { Question } from '@/lib/content.js'

export function FaqItem({ item }: { item: Question }) {
  const [open, setOpen] = useState(false)
  const answerId = useId()

  return (
    <li className="border-line border-b last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((value) => !value)}
        className="group text-ink grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left"
      >
        <span className="text-[1rem] font-medium text-pretty">
          {item.question}
        </span>
        <span className="group-hover:bg-action-soft group-hover:text-action inline-flex size-9 items-center justify-center rounded-full bg-surface-2 transition-colors duration-150">
          {open ? <Minus aria-hidden /> : <Plus aria-hidden />}
        </span>
      </button>
      <p
        id={answerId}
        hidden={!open}
        className="text-body max-w-[62ch] px-5 pb-5 text-[0.9375rem] text-pretty"
      >
        {item.answer}
      </p>
    </li>
  )
}
