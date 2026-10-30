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

interface TransactionFormProps extends TransactionFormFieldsProps {
  open: boolean
}

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
