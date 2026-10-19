import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DialogFooter } from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { useMoveToStatement, useStatementSearch } from '@/lib/statements.js'

/** The move dialog's bill pick and buttons: the card's other bills, newest
 * first. Mounts fresh with every opening, so nothing starts picked. */
export function MoveStatementFields({
  transaction,
  onClose,
}: {
  transaction: Transaction
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [statementId, setStatementId] = useState<number | undefined>()
  const move = useMoveToStatement()
  const bills = useStatementSearch({
    sort: [{ field: 'closeDate', dir: 'desc' }],
    filter: { accountId: transaction.linkedAccountId },
    skip: 0,
    limit: 24,
  })
  const options = (bills.data?.items ?? [])
    .filter((bill) => bill.id !== transaction.statementId)
    .map((bill) => ({
      value: bill.id,
      label: t('bills.bill-option', {
        due: formatDayLabel(bill.dueDate, i18n.language),
        status: t(`bills.status-${bill.status.toLowerCase()}`),
      }),
    }))
  const selected = options.find((option) => option.value === statementId)

  return (
    <>
      <Field>
        <FieldLabel htmlFor="move-statement">{t('bills.move-to')}</FieldLabel>
        <Select
          value={statementId === undefined ? null : String(statementId)}
          onValueChange={(value) =>
            setStatementId(value === null ? undefined : Number(value))
          }
        >
          <SelectTrigger id="move-statement" className="w-full">
            {/* The label renders explicitly, never from the items alone. */}
            <SelectValue>
              {selected === undefined
                ? t('bills.move-placeholder')
                : selected.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {move.isError ? (
        <p className="text-sm text-destructive">
          {move.error instanceof Error ? move.error.message : t('bills.error')}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('bills.cancel')}
        </Button>
        <Button
          disabled={statementId === undefined || move.isPending}
          onClick={() => {
            if (statementId === undefined) {
              return
            }

            move.mutate(
              { id: transaction.id, statementId },
              { onSuccess: onClose }
            )
          }}
        >
          {move.isPending ? t('bills.moving') : t('bills.move-confirm')}
        </Button>
      </DialogFooter>
    </>
  )
}
