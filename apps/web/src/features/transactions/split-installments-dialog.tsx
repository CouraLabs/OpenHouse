import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/dto'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { SplitInstallmentsFields } from './split-installments-fields.js'

export function SplitInstallmentsDialog({
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
