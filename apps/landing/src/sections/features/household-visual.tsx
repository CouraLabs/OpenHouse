import { useContent } from '@/lib/use-locale.js'

const MEMBERS = ['MR', 'JC', 'AL']

export function HouseholdVisual() {
  const { sampleHousehold } = useContent()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex -space-x-2">
        {MEMBERS.map((initials) => (
          <span
            key={initials}
            className="border-surface bg-bone text-ink flex size-9 items-center justify-center rounded-full border-2 font-mono text-[0.74rem]"
          >
            {initials}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        {sampleHousehold.inviteLabel}
        <kbd className="border-line bg-bone text-ink rounded border px-1.5 py-0.5 font-mono text-[0.74rem]">
          {sampleHousehold.code}
        </kbd>
      </div>
    </div>
  )
}
