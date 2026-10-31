import { Tag } from '@/components/tag.js'
import { useContent } from '@/lib/use-locale.js'

export function ScheduleVisual() {
  const { sampleRules, ruleStatus } = useContent()

  return (
    <ul className="divide-line flex flex-col divide-y">
      {sampleRules.map((rule) => (
        <li
          key={rule.name}
          className="flex items-center justify-between gap-4 py-2.5"
        >
          <span className="text-ink text-[0.875rem] font-medium">
            {rule.name}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">{rule.when}</span>
            <Tag tone={rule.posted ? 'green' : 'blue'}>
              {rule.posted ? ruleStatus.posted : ruleStatus.scheduled}
            </Tag>
          </div>
        </li>
      ))}
    </ul>
  )
}
