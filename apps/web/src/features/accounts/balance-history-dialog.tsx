import { useTranslation } from 'react-i18next'
import type { Account } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { BalanceHistoryBody } from './balance-history-body.js'

/**
 * The dialog an account's balance history opens in: a daily end-of-day
 * balance for a range, the last 30 days by default. The body mounts only
 * while an account is set, so each opening starts from the default range.
 */
export function BalanceHistoryDialog({
  account,
  onClose,
}: {
  /** The account whose history shows, or nothing while the dialog is closed. */
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
