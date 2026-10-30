import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import {
  TransferFormFields,
  type TransferFormFieldsProps,
} from './transfer-form-fields.js'

interface TransferFormProps extends TransferFormFieldsProps {
  open: boolean
}

export function TransferForm({
  open,
  onCancel,
  ...fieldProps
}: TransferFormProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('transactions.transfer-title')}</DialogTitle>
        </DialogHeader>
        <TransferFormFields {...fieldProps} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  )
}
