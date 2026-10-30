import type { ComponentProps } from 'react'

import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

interface NumberFieldProps {
  label: string
  labelFor: string
  value: string | undefined
  onValueChange: (value: string) => void
  error?: { message?: string }
  required?: boolean
}

export function NumberField({
  label,
  labelFor,
  value,
  onValueChange,
  error,
  required,
  ...inputProps
}: NumberFieldProps &
  Omit<ComponentProps<typeof Input>, 'type' | 'id' | 'value' | 'onChange'>) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={labelFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Input
        id={labelFor}
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(event) => onValueChange(normalizeNumber(event.target.value))}
        {...inputProps}
      />
      <FieldError errors={error !== undefined ? [error] : undefined} />
    </Field>
  )
}

function normalizeNumber(raw: string): string {
  const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')

  if (firstDot === -1) {
    return cleaned
  }

  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, '')
  )
}
