import type { TransactionFormFieldsProps } from './transaction-form-fields.js'
import { TransactionFormFields } from './transaction-form-fields.js'

interface TransactionFormProps extends TransactionFormFieldsProps {
  open: boolean
}

export function TransactionForm({ open, ...fieldProps }: TransactionFormProps) {
  return open ? <TransactionFormFields {...fieldProps} /> : null
}
