import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { Tag } from '@/components/tag.js'
import type { HouseModule } from '@/lib/content.js'
import { useContent } from '@/lib/use-locale.js'

const HUES: Record<HouseModule['tone'], string> = {
  green: 'var(--data-in)',
  blue: 'var(--data-blue)',
  red: 'var(--data-orange)',
  yellow: 'var(--data-olive)',
  bone: 'var(--data-slate)',
}

function HouseRow({ module, index }: { module: HouseModule; index: number }) {
  return (
    <Reveal
      as="li"
      index={index}
      className="flex flex-col gap-4 surface-card p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          aria-hidden
          className="h-1.5 w-8 rounded-full"
          style={{ backgroundColor: HUES[module.tone] }}
        />
        <Tag tone={module.tone}>{module.kind}</Tag>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-ink text-[1.375rem] leading-tight font-bold tracking-[-0.02em]">
          {module.name}
        </h3>
        <p className="text-[0.9375rem] text-pretty text-muted">
          {module.description}
        </p>
      </div>
    </Reveal>
  )
}

export function HouseIndexSection() {
  const { houseIntro, houseModules } = useContent()
  return (
    <Section id="the-house">
      <SectionHeading {...houseIntro} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {houseModules.map((module, index) => (
          <HouseRow key={module.name} module={module} index={index} />
        ))}
      </ul>
    </Section>
  )
}
