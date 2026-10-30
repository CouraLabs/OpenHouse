import { useTranslation } from 'react-i18next'
import type { Account } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { ReconcileForm } from './reconcile-form.js'

export function ReconcileDialog({
  account,
  onClose,
}: {
  account: Account | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={account !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('accounts.reconcile-title', { name: account?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {t('accounts.reconcile-description')}
          </DialogDescription>
        </DialogHeader>
        {account !== null ? (
          <ReconcileForm
            key={account.id}
            account={account}
            onDone={onClose}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
