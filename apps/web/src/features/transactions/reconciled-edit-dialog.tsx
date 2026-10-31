import { useTranslation } from 'react-i18next'
import type { ReconciledEditConflict } from '@workspace/dto'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'

interface ReconciledEditDialogProps {
  conflict: ReconciledEditConflict | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ReconciledEditDialog({
  conflict,
  isPending,
  onCancel,
  onConfirm,
}: ReconciledEditDialogProps) {
  const { t } = useTranslation()

  return (
    <ConfirmDialog
      open={conflict !== null}
      destructive
      title={t('transactions.reconciled-title')}
      description={t('transactions.reconciled-description', {
        date:
          conflict === null
            ? ''
            : formatDayLabel(conflict.reconciledThrough, formattingLocale(), {
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
