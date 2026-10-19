import { useTranslation } from 'react-i18next'
import {
  cardCycleOf,
  displayCloseDate,
  resolveStatement,
  type AccountRef,
} from '@workspace/poco'

import { formatDayLabel } from '@/lib/format-date-only.js'

/**
 * The live line under a card charge's day: which bill it lands on, computed
 * with the same `resolveStatement` the API assigns by — no round-trip. A
 * charge pinned to a bill by hand shows that bill instead; a card whose
 * days are unset asks for them. Renders nothing off a card.
 */
export function BilledOnLine({
  account,
  transactionDt,
  pinnedDueDate,
}: {
  account: AccountRef | undefined
  transactionDt: string | undefined
  /** The due date of the bill a pinned charge stays on, or nothing. */
  pinnedDueDate: string | null
}) {
  const { t, i18n } = useTranslation()

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
          due: formatDayLabel(pinnedDueDate, i18n.language),
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
        due: formatDayLabel(window.dueDate, i18n.language),
        close: formatDayLabel(displayCloseDate(cycle, window), i18n.language),
      })}
    </p>
  )
}
