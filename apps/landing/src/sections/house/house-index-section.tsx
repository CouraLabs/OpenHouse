import { cn } from 'cn'

import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { Tag } from '@/components/tag.js'
import type { HouseModule } from '@/lib/content.js'
import { useContent } from '@/lib/use-locale.js'

function HouseRow({
  module,
  statusLabel,
  index,
}: {
  module: HouseModule
  statusLabel: string
  index: number
}) {
  return (
    <Reveal
      as="li"
      index={index}
      className={cn(
        'border-line border-b px-(--pad) py-6 md:grid md:grid-cols-[13rem_1fr_auto_auto] md:items-center md:gap-x-6',
        module.status === 'live' && 'bg-surface'
      )}
    >
      <h3 className="text-ink font-display text-2xl leading-tight font-medium tracking-[-0.02em]">
        {module.name}
      </h3>
      <p className="mt-2 text-sm text-pretty text-muted md:mt-0">
        {module.description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 md:contents">
        <Tag>{module.kind}</Tag>
        <Tag className="md:justify-self-end">{statusLabel}</Tag>
      </div>
    </Reveal>
  )
}

export function HouseIndexSection() {
  const { houseIntro, houseModules, houseStatus } = useContent()
  return (
    <Section id="the-house">
      <SectionHeading {...houseIntro} />
      <ul className="border-line -mx-(--pad) border-t">
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
