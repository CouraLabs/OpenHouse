import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import type { ComponentProps } from 'react'

/**
 * The input types a form field can hold. `tenantCode` is a text input the
 * user pastes an invite code into — separated from `text` so a code field
 * reads as one in the markup and can be styled as one.
 */
export type TextFieldType = 'email' | 'password' | 'text' | 'tenantCode'

/** The HTML input type a `TextFieldType` renders. */
const INPUT_TYPES: Record<TextFieldType, 'email' | 'password' | 'text'> = {
  email: 'email',
  password: 'password',
  text: 'text',
  tenantCode: 'text',
}

/** The label a `TextFieldType` reads as. */
const LABELS: Record<TextFieldType, string> = {
  email: 'Email',
  password: 'Password',
  text: '',
  tenantCode: 'Tenant code',
}

interface TextFieldProps {
  type: TextFieldType
  /** The label above the input. Overrides the default the type carries. */
  label?: string
  labelFor: string
  error?: { message?: string }
  /** Whether the field is required: marks the label with a red asterisk
   * and carries the native `required` attribute for assistive tech. */
  required?: boolean
}

/**
 * One field of a form: label, input, error. The parent form owns the state —
 * this component only presents it, so the registration props a
 * react-hook-form `register` returns pass through untouched.
 */
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
          {required ? (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          ) : null}
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
