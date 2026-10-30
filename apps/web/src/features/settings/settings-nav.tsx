import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

import type { SettingsSection } from './settings-sections.js'

export function SettingsNav({
  sections,
  active,
}: {
  sections: readonly SettingsSection[]
  active: SettingsSection
}) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('settings.title')}
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
    >
      {sections.map((section) => (
        <Link
          key={section}
          to="/settings/$section"
          params={{ section }}
          aria-current={section === active ? 'page' : undefined}
          className={cn(
            'shrink-0 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
            section === active
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {t(`settings.tabs.${section}`)}
        </Link>
      ))}
    </nav>
  )
}
