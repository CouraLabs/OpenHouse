import { useTranslation } from 'react-i18next'
import { defaultPaymentStatement } from '@workspace/poco'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { useStatementSearch } from '@/lib/statements.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The bill a transfer into a card pays. Nothing picked shows the card's
 * default — its oldest unpaid closed bill, else the open one — which is the
 * same `defaultPaymentStatement` the API settles when the body names none,
 * so the form never has to write the default into its values. A card with
 * no bill yet shows "Current bill": the API opens the one today lands on.
 */
export function PaymentBillPick({
  cardId,
  value,
  onChange,
}: {
  cardId: number
  value: number | undefined
  onChange: (value: number) => void
}) {
  const { t } = useTranslation()
  const bills = useStatementSearch({
    sort: [{ field: 'closeDate', dir: 'desc' }],
    filter: { accountId: cardId },
    skip: 0,
    limit: 24,
  })
  const items = bills.data?.items ?? []
  const shown =
    items.find((bill) => bill.id === value) ?? defaultPaymentStatement(items)
  const label = (bill: (typeof items)[number]) =>
    t('bills.bill-option', {
      due: formatDayLabel(bill.dueDate, formattingLocale()),
      status: t(`bills.status-${bill.status.toLowerCase()}`),
    })

  return (
    <Field>
      <FieldLabel htmlFor="transfer-bill">
        {t('transactions.transfer-bill')}
      </FieldLabel>
      <Select
        value={shown === undefined ? null : String(shown.id)}
        onValueChange={(rawValue) => {
          if (rawValue !== null) {
            onChange(Number(rawValue))
          }
        }}
      >
        <SelectTrigger id="transfer-bill" className="w-full">
          {/* The label renders explicitly, never from the items alone. */}
          <SelectValue>
            {shown === undefined
              ? t('transactions.transfer-bill-current')
              : label(shown)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((bill) => (
            <SelectItem key={bill.id} value={String(bill.id)}>
              {label(bill)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
