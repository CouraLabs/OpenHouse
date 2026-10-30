import type { TransferFormFieldsProps } from './transfer-form-fields.js'
import { TransferFormFields } from './transfer-form-fields.js'

interface TransferFormProps extends TransferFormFieldsProps {
  open: boolean
}

export function TransferForm({ open, ...fieldProps }: TransferFormProps) {
  return open ? <TransferFormFields {...fieldProps} /> : null
}
