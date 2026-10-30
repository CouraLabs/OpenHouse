import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function NoSavingsAccount() {
  const { t } = useTranslation()

  return (
    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      {t('goals.no-savings')}{' '}
      <Link to="/accounts" className="text-foreground underline">
        {t('goals.no-savings-link')}
      </Link>
    </p>
  )
}
