import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useTierStatus } from '@/lib/tier-status.js'

export function TransactionWindowNotice() {
  const { t } = useTranslation()
  const start = useTierStatus().data?.transactionWindowStart ?? null

  if (start === null) {
    return null
  }

  return (
    <p className="rounded-2xl bg-primary/5 px-4 py-3 text-sm text-pretty ring-1 ring-primary/15">
      {t('transactions.window-notice', {
        date: formatDayLabel(start, formattingLocale(), { dateStyle: 'long' }),
      })}{' '}
      <Link
        to="/settings/$section"
        params={{ section: 'plan' }}
        className="text-foreground underline underline-offset-4"
      >
        {t('transactions.window-plan-link')}
      </Link>
    </p>
  )
}
