import { useTranslation } from 'react-i18next'
import type { ReconciledEditConflict } from '@workspace/poco'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'

import { formatDayLabel } from '@/lib/format-date-only.js'

/** The props `ReconciledEditDialog` takes. */
interface ReconciledEditDialogProps {
  /** The conflict the API answered, or nothing while the dialog is closed. */
  conflict: ReconciledEditConflict | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Asks before a change to a transaction that was reconciled with the bank:
 * the row sits on or before its account's `reconciledThrough`, so editing it
 * can break a balance already matched.
 */
export function ReconciledEditDialog({
  conflict,
  isPending,
  onCancel,
  onConfirm,
}: ReconciledEditDialogProps) {
  const { t, i18n } = useTranslation()

  return (
    <ConfirmDialog
      open={conflict !== null}
      destructive
      title={t('transactions.reconciled-title')}
      description={t('transactions.reconciled-description', {
        date:
          conflict === null
            ? ''
            : formatDayLabel(conflict.reconciledThrough, i18n.language, {
                dateStyle: 'medium',
              }),
      })}
      confirmLabel={t('transactions.reconciled-confirm')}
      pendingLabel={t('transactions.saving')}
      cancelLabel={t('transactions.cancel')}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
