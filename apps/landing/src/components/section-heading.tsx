import { cn } from 'cn'

import { Reveal } from './reveal.js'

export function SectionHeading({
  title,
  lede,
  className,
}: {
  title: string
  lede?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid items-end gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:gap-12',
        className
      )}
    >
      <Reveal>
        <h2 className="text-ink max-w-[18ch] text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance">
          {title}
        </h2>
      </Reveal>
      {lede && (
        <Reveal index={1}>
          <p className="max-w-[52ch] text-[1.0625rem] text-pretty text-muted">
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  )
}
