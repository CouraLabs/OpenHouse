import { RequiredMark } from '@workspace/ui/components/required-mark'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import type { ComponentProps } from 'react'

export type TextFieldType = 'email' | 'password' | 'text' | 'tenantCode'

const INPUT_TYPES: Record<TextFieldType, 'email' | 'password' | 'text'> = {
  email: 'email',
  password: 'password',
  text: 'text',
  tenantCode: 'text',
}

const LABELS: Record<TextFieldType, string> = {
  email: 'Email',
  password: 'Password',
  text: '',
  tenantCode: 'Tenant code',
}

interface TextFieldProps {
  type: TextFieldType
  label?: string
  labelFor: string
  error?: { message?: string }
  required?: boolean
}

export function TextField({
  type,
  label,
  labelFor,
  error,
  required,
  ...inputProps
}: TextFieldProps & Omit<ComponentProps<typeof Input>, 'type' | 'id'>) {
  const shownLabel = label ?? LABELS[type]

  return (
    <Field data-invalid={error !== undefined}>
      {shownLabel !== '' && (
        <FieldLabel htmlFor={labelFor}>
          {shownLabel}
          {required ? <RequiredMark /> : null}
        </FieldLabel>
      )}
      <Input
        id={labelFor}
        type={INPUT_TYPES[type]}
        required={required}
        aria-invalid={error !== undefined}
        {...inputProps}
      />
      <FieldError errors={error !== undefined ? [error] : undefined} />
    </Field>
  )
}
