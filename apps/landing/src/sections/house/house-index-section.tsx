import { ArrowUpRight } from '@phosphor-icons/react'
import { cn } from 'cn'

import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { Tag } from '@/components/tag.js'
import type { HouseModule } from '@/lib/content.js'
import { useContent } from '@/lib/use-locale.js'

/**
 * The quiet status at a row's end: Live on the green wash for the ledger,
 * a bone pill for what is announced but not here yet — same pill either way.
 */
function StatusBadge({
  status,
  label,
}: {
  status: HouseModule['status']
  label: string
}) {
  return <Tag tone={status === 'live' ? 'green' : 'bone'}>{label}</Tag>
}

/**
 * One module as a ruled row, read like a book's table of contents: serif
 * name, one plain line, the room it is, and its status at the row's end.
 * Hovering raises the small arrow — the section's one authored moment.
 */
function HouseRow({
  module,
  statusLabel,
  index,
}: {
  module: HouseModule
  statusLabel: string
  index: number
}) {
  const live = module.status === 'live'
  return (
    <Reveal
      as="li"
      index={index}
      className={cn(
        'group border-line border-b py-6 md:grid md:grid-cols-[13rem_1fr_auto_auto] md:items-center md:gap-x-6',
        live && 'bg-green-wash/50'
      )}
    >
      <h3
        className={cn(
          'font-serif text-2xl leading-tight font-light tracking-[-0.02em]',
          live ? 'text-green-ink' : 'text-ink'
        )}
      >
        {module.name}
      </h3>
      <p className="mt-2 text-sm text-pretty text-muted md:mt-0">
        {module.description}
      </p>
      <Tag tone={module.tone} className="mt-3 md:mt-0">
        {module.kind}
      </Tag>
      <div className="mt-3 flex items-center justify-between gap-3 md:mt-0 md:justify-end">
        <ArrowUpRight
          aria-hidden
          size={14}
          className={cn(
            'hidden -translate-x-1 translate-y-1 opacity-0 transition-[opacity,transform] duration-300 ease-(--ease-out-expo) group-hover:translate-0 group-hover:opacity-100 md:block',
            live ? 'text-green-ink' : 'text-muted'
          )}
        />
        <StatusBadge status={module.status} label={statusLabel} />
      </div>
    </Reveal>
  )
}

/**
 * The house index: the ledger-style list of what the shared home holds —
 * money live today, the rest of home life as announced arrivals.
 */
export function HouseIndexSection() {
  const { houseIntro, houseModules, houseStatus } = useContent()
  return (
    <Section id="the-house">
      <SectionHeading {...houseIntro} />
      <ul className="border-line border-t">
        {houseModules.map((module, index) => (
          <HouseRow
            key={module.name}
            module={module}
            statusLabel={
              module.status === 'live' ? houseStatus.live : houseStatus.coming
            }
            index={index}
          />
        ))}
      </ul>
    </Section>
  )
}
