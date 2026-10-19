import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { MoveStatementFields } from './move-statement-fields.js'

/**
 * Moves a card charge to another bill of the same card — a merchant posted
 * late and the bank billed it a cycle on. The charge is pinned there, so a
 * later date edit keeps it. Rendered inside the dialog's content, which
 * unmounts on close, so every opening starts with nothing picked.
 */
export function MoveStatementDialog({
  transaction,
  onClose,
}: {
  /** The charge to move, or nothing while the dialog is closed. */
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
