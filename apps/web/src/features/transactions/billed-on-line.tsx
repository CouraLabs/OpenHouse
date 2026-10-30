import { useTranslation } from 'react-i18next'
import {
  cardCycleOf,
  displayCloseDate,
  resolveStatement,
  type AccountRef,
} from '@workspace/poco'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'

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

  if (account === undefined || account.type !== 'Credit Card') {
    return null
  }

  const cycle = cardCycleOf(account)

  if (cycle === null) {
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

  if (transactionDt === undefined || transactionDt === '') {
    return null
  }

  const window = resolveStatement(cycle, transactionDt)

  return (
    <p className="text-sm text-muted-foreground">
      {t('transactions.billed-on', {
        due: formatDayLabel(window.dueDate, formattingLocale()),
        close: formatDayLabel(displayCloseDate(cycle, window), formattingLocale()),
      })}
    </p>
  )
}
