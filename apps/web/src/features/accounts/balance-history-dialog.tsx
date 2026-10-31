import { useTranslation } from 'react-i18next'
import type { Account } from '@workspace/dto'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { BalanceHistoryBody } from './balance-history-body.js'

export function BalanceHistoryDialog({
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('accounts.history-title', { name: account?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {t('accounts.history-description')}
          </DialogDescription>
        </DialogHeader>
        {account !== null ? (
          <BalanceHistoryBody key={account.id} account={account} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
