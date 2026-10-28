import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { formatMoney } from '@/lib/format-money.js'
import { InstallmentGroupBody } from './installment-group-body.js'
import { useInstallmentGroup } from './use-transactions.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The menu of an installment purchase, opened from any of its rows: the
 * group is read fresh, so `editable` always reflects the bills as they are
 * now. The body mounts per opening, so it never keeps a stale step.
 */
export function InstallmentGroupDialog({
  transaction,
  onClose,
}: {
  /** A row of the purchase, or nothing while the dialog is closed. */
  transaction: Transaction | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const group = useInstallmentGroup(transaction?.installmentGroupId ?? null)

  return (
    <Dialog
      open={transaction !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {group.data?.name ?? t('transactions.group-title')}
          </DialogTitle>
          <DialogDescription>
            {group.data === undefined
              ? t('transactions.group-loading')
              : t('transactions.group-description', {
                  count: group.data.count,
                  total: formatMoney(
                    group.data.total,
                    formattingLocale(),
                    group.data.currency
                  ),
                })}
          </DialogDescription>
        </DialogHeader>
        {transaction !== null && group.data !== undefined ? (
          <InstallmentGroupBody
            key={group.data.groupId}
            group={group.data}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
