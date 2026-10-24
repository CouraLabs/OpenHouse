import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'
import { useSession } from '@/lib/auth.js'
import { ChangePasswordForm } from './change-password-form.js'
import { DataSection } from './data-section.js'
import { GeneralSettingsForm } from './general-settings-form.js'
import { PreferencesForm } from './preferences-form.js'
import { RecoveryCodesSection } from './recovery-codes-section.js'
import { SettingsNav } from './settings-nav.js'
import { sectionsFor, type SettingsSection } from './settings-sections.js'
import { UsersSection } from './users-section.js'

/**
 * The Settings page, laid out as an account page: the sections the role
 * may open in a side navigation, the selected one beside it. An owner sees
 * General (time zone, main currency), Users, Data (export and
 * tenant deletion), Preferences, and Security
 * (password and recovery codes); a member sees Preferences and Security
 * (password only). Each section has its own URL,
 * `/settings/<section>`; `/settings` opens the first one the role may see.
 */
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
          {active === 'users' ? <UsersSection /> : null}
          {active === 'data' ? <DataSection /> : null}
          {active === 'preferences' ? <PreferencesForm /> : null}
          {active === 'security' ? (
            <div className="flex flex-col gap-6">
              <ChangePasswordForm />
              {/* Members recover through their owner's reset code. */}
              {role === 'owner' ? <RecoveryCodesSection /> : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
