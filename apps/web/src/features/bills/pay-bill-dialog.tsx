import { useTranslation } from 'react-i18next'
import type { CreditCardStatement } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { PayBillFields } from './pay-bill-fields.js'
import { useActiveAccounts } from './use-bills.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * Pays one bill from another account. The fields mount once the accounts
 * are in, so the form starts with the default account already picked —
 * only accounts of the card's currency that are not cards can pay.
 */
export function PayBillDialog({
  bill,
  open,
  onClose,
}: {
  bill: CreditCardStatement
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const accounts = useActiveAccounts()
  const payers = (accounts.data ?? []).filter(
    (account) =>
      account.type !== 'Credit Card' && account.currency === bill.currency
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bills.pay-title')}</DialogTitle>
          <DialogDescription>
            {t('bills.pay-description', {
              card: bill.accountName,
              due: formatDayLabel(bill.dueDate, formattingLocale()),
            })}
          </DialogDescription>
        </DialogHeader>
        {accounts.data === undefined ? null : (
          <PayBillFields bill={bill} accounts={payers} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}
