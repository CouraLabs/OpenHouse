import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { SplitInstallmentsFields } from './split-installments-fields.js'

/** Converts a single card expense into installments, while its bill is
 * Open — the API answers 409 once it is billed. */
export function SplitInstallmentsDialog({
  transaction,
  onClose,
}: {
  /** The expense to split, or nothing while the dialog is closed. */
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
          <DialogTitle>{t('transactions.split-title')}</DialogTitle>
          <DialogDescription>
            {t('transactions.split-description', {
              name: transaction?.name ?? '',
            })}
          </DialogDescription>
        </DialogHeader>
        {transaction !== null ? (
          <SplitInstallmentsFields
            transaction={transaction}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
