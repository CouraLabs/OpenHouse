import { useContent } from '@/lib/use-locale.js'

/** Household members by initials; the last one joins by invite. */
const MEMBERS = ['MR', 'JC', 'AL']

/** The household's members, then the invite code a new one types in. */
export function HouseholdVisual() {
  const { sampleHousehold } = useContent()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex -space-x-2">
        {MEMBERS.map((initials) => (
          <span
            key={initials}
            className="border-surface bg-bone text-ink flex size-9 items-center justify-center rounded-full border-2 font-mono text-[11px]"
          >
            {initials}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        {sampleHousehold.inviteLabel}
        <kbd className="border-line bg-bone text-ink rounded border px-1.5 py-0.5 font-mono text-[11px]">
          {sampleHousehold.code}
        </kbd>
      </div>
    </div>
  )
}
