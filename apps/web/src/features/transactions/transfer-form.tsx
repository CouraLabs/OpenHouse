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

/** The props `TransferForm` takes. */
interface TransferFormProps extends TransferFormFieldsProps {
  /** Whether the dialog is open. */
  open: boolean
}

/**
 * The transfer dialog: money moving from one account to another, which the
 * API materializes as two transactions. Once one account is chosen, the
 * accounts of another currency disable — a transfer never crosses
 * currencies, and the API enforces it again.
 */
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
