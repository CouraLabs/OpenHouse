import { InitialsTile } from '@/components/preview/initials-tile.js'
import { useContent } from '@/lib/use-locale.js'

const MEMBERS = ['Maria Rivera', 'Joao Costa', 'Ana Lima']

export function HouseholdVisual() {
  const { sampleHousehold } = useContent()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex -space-x-2">
        {MEMBERS.map((name) => (
          <InitialsTile
            key={name}
            name={name}
            round
            className="ring-surface size-10 ring-2"
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        {sampleHousehold.inviteLabel}
        <kbd className="text-ink rounded-md bg-surface-2 px-2 py-1 font-mono text-[0.75rem]">
          {sampleHousehold.code}
        </kbd>
      </div>
    </div>
  )
}
