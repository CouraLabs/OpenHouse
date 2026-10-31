import { useTranslation } from 'react-i18next'
import { type AccountRef } from '@workspace/dto'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useBilledOnPreview } from './use-transactions.js'

export function BilledOnLine({
  account,
  transactionDt,
  pinnedDueDate,
}: {
  account: AccountRef | undefined
  transactionDt: string | undefined
  pinnedDueDate: string | null
}) {
  const { t } = useTranslation()
  const isCard = account?.type === 'Credit Card'
  const hasCycle =
    isCard && account.closeDay !== null && account.dueDay !== null
  const preview = useBilledOnPreview(
    hasCycle &&
      account.closeDay !== null &&
      account.dueDay !== null &&
      pinnedDueDate === null &&
      transactionDt !== undefined &&
      transactionDt !== ''
      ? {
          closeDay: account.closeDay,
          dueDay: account.dueDay,
          closeDayInclusive: account.closeDayInclusive,
          transactionDt,
        }
      : null
  )

  if (!isCard) {
    return null
  }

  if (!hasCycle) {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        {t('transactions.billed-on-missing')}
      </p>
    )
  }

  if (pinnedDueDate !== null) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('transactions.billed-on-pinned', {
          due: formatDayLabel(pinnedDueDate, formattingLocale()),
        })}
      </p>
    )
  }

  const window = preview.data ?? null

  if (window === null) {
    return null
  }

  return (
    <p className="text-sm text-muted-foreground">
      {t('transactions.billed-on', {
        due: formatDayLabel(window.dueDate, formattingLocale()),
        close: formatDayLabel(window.closeDate, formattingLocale()),
      })}
    </p>
  )
}
