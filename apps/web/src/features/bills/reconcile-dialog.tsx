import { useTranslation } from 'react-i18next'
import type { CreditCardStatement } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { ReconcileFields } from './reconcile-fields.js'

/** Reconciles one bill against the total printed on the bank's bill. */
export function ReconcileDialog({
  bill,
  open,
  onClose,
}: {
  bill: CreditCardStatement
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('bills.reconcile-title')}</DialogTitle>
          <DialogDescription>
            {t('bills.reconcile-description')}
          </DialogDescription>
        </DialogHeader>
        <ReconcileFields bill={bill} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
