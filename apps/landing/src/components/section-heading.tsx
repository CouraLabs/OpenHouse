import { cn } from 'cn'

import { Eyebrow } from './eyebrow.js'
import { Reveal } from './reveal.js'
import { Tick } from './tick.js'

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
    <div
      className={cn(
        'cell-rule-b relative -m-(--pad) mb-0 grid md:grid-cols-[var(--split)_1fr]',
        className
      )}
    >
      <div className="flex flex-col justify-end gap-4 p-(--pad) pb-6 md:pb-(--pad)">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
        {lede && (
          <Reveal index={2} className="max-md:hidden">
            <p className="text-body max-w-[42ch] text-[1.02rem] text-pretty">
              {lede}
            </p>
          </Reveal>
        )}
      </div>
      <div className="split-rule flex flex-col items-start justify-end gap-5 p-(--pad) pt-0 md:flex-row md:items-end md:pt-(--pad)">
        <Reveal index={1}>
          <h2 className="text-ink font-display text-[clamp(2.2rem,4.6vw,4rem)] leading-[1] font-medium tracking-[-0.05em] text-balance">
            {title}
          </h2>
        </Reveal>
        {lede && (
          <Reveal index={2} className="md:hidden">
            <p className="text-body max-w-[42ch] text-[1.02rem] text-pretty">
              {lede}
            </p>
          </Reveal>
        )}
      </div>
      <span className="hidden md:contents">
        <Tick x="var(--split)" y="0" />
        <Tick x="var(--split)" y="100%" />
      </span>
      <Tick x="0" y="100%" />
      <Tick x="100%" y="100%" />
    </div>
  )
}
