import { cn } from 'cn'

import { Eyebrow } from './eyebrow.js'
import { Reveal } from './reveal.js'

/** A section's kicker, serif title, and optional lede, stacked. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow: string
  title: string
  lede?: string
  className?: string
}) {
  return (
    <div className={cn('flex max-w-2xl flex-col gap-4', className)}>
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal index={1}>
        <h2 className="text-ink font-serif text-4xl leading-[1.1] tracking-[-0.03em] text-balance md:text-5xl">
          {title}
        </h2>
      </Reveal>
      {lede && (
        <Reveal index={2}>
          <p className="text-base text-pretty text-muted md:text-lg">{lede}</p>
        </Reveal>
      )}
    </div>
  )
}
