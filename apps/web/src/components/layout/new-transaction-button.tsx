import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'

export function NewTransactionButton() {
  const { t } = useTranslation()

  return (
    <Button
      nativeButton={false}
      render={<Link to="/transactions" search={{ new: true }} />}
      aria-label={t('shell.new-transaction')}
      className="max-md:size-10 max-md:px-0"
    >
      <Plus />
      <span className="max-md:sr-only">{t('shell.new-transaction')}</span>
    </Button>
  )
}
