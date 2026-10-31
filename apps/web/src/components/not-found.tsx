import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'
import { currentSession } from '@/lib/query.js'
import { AppShell } from '@/components/layout/app-shell.js'

function NotFoundBody() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('not-found.title')}
        subtitle={t('not-found.description')}
      />
      <Link
        to="/"
        className="w-fit text-sm text-foreground underline underline-offset-4"
      >
        {t('not-found.home')}
      </Link>
    </main>
  )
}

export function NotFound() {
  const session = currentSession()

  if (session === null) {
    return <NotFoundBody />
  }

  return (
    <AppShell session={session}>
      <NotFoundBody />
    </AppShell>
  )
}
