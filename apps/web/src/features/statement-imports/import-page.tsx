import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'

import { PageHeader } from '@/components/page-header.js'
import { ImportFlow } from './import-flow.js'
import { useImportAccount } from './use-statement-imports.js'

export function ImportPage() {
  const { t } = useTranslation()
  const { accountId } = useParams({ from: '/_main/accounts/$accountId/import' })
  const account = useImportAccount(Number(accountId))
  const navigate = useNavigate()

  const back = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/accounts" />}
    >
      <ArrowLeft />
      {t('imports.back-to-accounts')}
    </Button>
  )

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('imports.title', { name: account.data?.name ?? '' })}
        subtitle={
          account.isError
            ? t('imports.account-not-found')
            : t('imports.description')
        }
        actions={back}
      />
      {account.data !== undefined ? (
        <ImportFlow
          key={account.data.id}
          account={account.data}
          onClose={() => void navigate({ to: '/accounts' })}
        />
      ) : null}
    </main>
  )
}
