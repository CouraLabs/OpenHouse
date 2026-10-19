import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'

import {
  TransactionFormFields,
  type TransactionFormFieldsProps,
} from './transaction-form-fields.js'

/** The props `TransactionForm` takes. */
interface TransactionFormProps extends TransactionFormFieldsProps {
  /** Whether the sheet is open. */
  open: boolean
}

/**
 * The insert and edit form of the transactions page, in a side sheet: the
 * cards and the grid would be pushed far down by an inline form on this
 * page, and the sheet keeps the month context visible. The account's
 * balance moves with the save — the form never edits `balanceOnDt`.
 */
export function TransactionForm({
  open,
  onCancel,
  ...fieldProps
}: TransactionFormProps) {
  const { t } = useTranslation()

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <SheetContent
        side="right"
        className="flex flex-col gap-4 overflow-y-auto p-6 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {fieldProps.transaction === null
              ? t('transactions.new-title')
              : t('transactions.edit-title')}
          </SheetTitle>
        </SheetHeader>
        <TransactionFormFields {...fieldProps} onCancel={onCancel} />
      </SheetContent>
    </Sheet>
  )
}
