import { Tag } from '@/components/tag.js'
import { useContent } from '@/lib/use-locale.js'

/** Upcoming recurring rules — the first already posted by itself. */
export function ScheduleVisual() {
  const { sampleRules, ruleStatus } = useContent()

  return (
    <ul className="divide-line flex flex-col divide-y">
      {sampleRules.map((rule) => (
        <li
          key={rule.name}
          className="flex items-center justify-between gap-4 py-2.5"
        >
          <span className="text-ink text-sm">{rule.name}</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted">{rule.when}</span>
            <Tag tone={rule.posted ? 'green' : 'blue'}>
              {rule.posted ? ruleStatus.posted : ruleStatus.scheduled}
            </Tag>
          </div>
        </li>
      ))}
    </ul>
  )
}
