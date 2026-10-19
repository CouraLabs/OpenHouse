import { Tag } from '@/components/tag.js'

/** The recurring rules the card lists, in posting order. */
const RULES = [
  { name: 'Monthly rent', when: 'Nov 1', posted: true },
  { name: 'Streaming plan', when: 'Nov 4', posted: false },
  { name: 'City Power', when: 'Nov 12', posted: false },
]

/** Upcoming recurring rules — the first already posted by itself. */
export function ScheduleVisual() {
  return (
    <ul className="divide-line flex flex-col divide-y">
      {RULES.map((rule) => (
        <li
          key={rule.name}
          className="flex items-center justify-between gap-4 py-2.5"
        >
          <span className="text-ink text-sm">{rule.name}</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted">{rule.when}</span>
            <Tag tone={rule.posted ? 'green' : 'blue'}>
              {rule.posted ? 'Posted' : 'Scheduled'}
            </Tag>
          </div>
        </li>
      ))}
    </ul>
  )
}
