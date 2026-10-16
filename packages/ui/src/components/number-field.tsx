import type { ComponentProps } from 'react'

import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

interface NumberFieldProps {
  /** The label above the input. */
  label: string
  labelFor: string
  /** The current value, as a plain numeric string like `"10"`; empty while
   * unset. A decimal point may carry fractions — `"0.8"` — and a comma the
   * user typed normalizes to a dot. */
  value: string | undefined
  /** What typing does: hands back the sanitized numeric string. */
  onValueChange: (value: string) => void
  error?: { message?: string }
  required?: boolean
}

/**
 * One numeric field of a form: label, input, error. Like `MoneyField` the
 * parent form owns the state — the value is a plain string the caller
 * parses, so a rate, a count, or a period flows through untouched. Only
 * digits, one decimal separator (a comma normalizes to a dot), and nothing
 * else survive typing.
 */
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

/** Keeps the digits, the first dot, and turns a comma into a dot. */
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
