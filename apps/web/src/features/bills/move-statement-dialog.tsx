import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/dto'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { MoveStatementFields } from './move-statement-fields.js'

export function MoveStatementDialog({
  transaction,
  onClose,
}: {
  transaction: Transaction | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={transaction !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bills.move-title')}</DialogTitle>
          <DialogDescription>
            {transaction?.paymentStatementId != null
              ? t('bills.move-payment-description')
              : t('bills.move-description', { name: transaction?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        {transaction !== null ? (
          <MoveStatementFields transaction={transaction} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
