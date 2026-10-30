import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'
import { useSession } from '@/lib/auth.js'
import { ChangePasswordForm } from './change-password-form.js'
import { DataSection } from './data-section.js'
import { GeneralSettingsForm } from './general-settings-form.js'
import { PlanSection } from './plan-section.js'
import { PreferencesForm } from './preferences-form.js'
import { RecoveryCodesSection } from './recovery-codes-section.js'
import { SettingsNav } from './settings-nav.js'
import { sectionsFor, type SettingsSection } from './settings-sections.js'
import { UsersSection } from './users-section.js'

export function SettingsPage() {
  const { t } = useTranslation()
  const session = useSession()
  const params = useParams({ strict: false }) as { section?: SettingsSection }
  const role = session.data?.user.role ?? 'user'
  const sections = sectionsFor(role)
  const active =
    params.section !== undefined && sections.includes(params.section)
      ? params.section
      : sections[0]

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <aside className="md:w-48 md:shrink-0">
          <SettingsNav sections={sections} active={active} />
        </aside>
        <section className="min-w-0 flex-1">
          {active === 'general' ? <GeneralSettingsForm /> : null}
          {active === 'plan' ? <PlanSection /> : null}
          {active === 'users' ? <UsersSection /> : null}
          {active === 'data' ? <DataSection /> : null}
          {active === 'preferences' ? <PreferencesForm /> : null}
          {active === 'security' ? (
            <div className="flex flex-col gap-6">
              <ChangePasswordForm />
              {}
              {role === 'owner' ? <RecoveryCodesSection /> : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
