import { useTranslation } from 'react-i18next'
import type { UpcomingItem } from '@workspace/dto'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'
import { UpcomingItemRow } from './upcoming-item-row.js'

export function UpcomingGroupedList({
  items,
  today,
}: {
  items: UpcomingItem[]
  today: string
}) {
  const { t } = useTranslation()
  const groups = new Map<string, UpcomingItem[]>()

  for (const item of items) {
    const key =
      item.kind === 'bill' && item.overdue
        ? 'overdue'
        : item.date <= today
          ? 'today'
          : item.date
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([key, group]) => (
        <section key={key} className="flex flex-col gap-1">
          <h3
            className={
              key === 'overdue' ? 'label-caps text-negative!' : 'label-caps'
            }
          >
            {key === 'overdue'
              ? t('upcoming.group-overdue')
              : key === 'today'
                ? t('upcoming.group-today')
                : formatDayLabel(key, formattingLocale(), {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
          </h3>
          <ul className="flex flex-col">
            {group.map((item) => (
              <UpcomingItemRow key={item.key} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
