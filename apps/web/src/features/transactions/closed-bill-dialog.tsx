import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { useMoveToStatement, useStatementSearch } from '@/lib/statements.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ClosedBillDialog({
  transaction,
  onClose,
}: {
  transaction: Transaction | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const move = useMoveToStatement()
  const open = useStatementSearch(
    {
      sort: [{ field: 'closeDate', dir: 'asc' }],
      filter: {
        accountId: transaction?.linkedAccountId,
        status: ['Open'],
      },
      skip: 0,
      limit: 1,
    },
    { enabled: transaction !== null }
  )
  const openBill = open.data?.items[0]
  const close = () => {
    move.reset()
    onClose()
  }

  return (
    <Dialog
      open={transaction !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) close()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('transactions.closed-bill-title')}</DialogTitle>
          <DialogDescription>
            {openBill === undefined
              ? t('transactions.closed-bill-keep-only', {
                  due: formatDayLabel(
                    transaction?.statementDueDate ?? '',
                    formattingLocale()
                  ),
                })
              : t('transactions.closed-bill-description', {
                  due: formatDayLabel(
                    transaction?.statementDueDate ?? '',
                    formattingLocale()
                  ),
                  openDue: formatDayLabel(openBill.dueDate, formattingLocale()),
                })}
          </DialogDescription>
        </DialogHeader>
        {move.isError ? (
          <p className="text-sm text-destructive">
            {move.error instanceof Error
              ? move.error.message
              : t('transactions.error')}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('transactions.closed-bill-keep')}
          </Button>
          {openBill !== undefined && transaction !== null ? (
            <Button
              disabled={move.isPending}
              onClick={() =>
                move.mutate(
                  { id: transaction.id, statementId: openBill.id },
                  { onSuccess: close }
                )
              }
            >
              {t('transactions.closed-bill-move', {
                due: formatDayLabel(openBill.dueDate, formattingLocale()),
              })}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
