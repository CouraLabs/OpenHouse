import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'

import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { formatInput, parseInput } from '@workspace/ui/lib/money-input'

interface MoneyFieldProps {
  locale: string
  value: string | undefined
  onValueChange: (amount: string) => void
  label: string
  labelFor: string
  error?: { message?: string }
  required?: boolean
  currency?: string
}

export function MoneyField({
  locale,
  value,
  onValueChange,
  label,
  labelFor,
  error,
  required,
  currency,
  onBlur,
  ...inputProps
}: MoneyFieldProps &
  Omit<
    ComponentProps<typeof Input>,
    'type' | 'id' | 'value' | 'onChange' | 'ref'
  >) {
  const [text, setText] = useState(() => formatInput(value, locale))
  const errorId = `${labelFor}-error`

  useEffect(() => {
    if (parseInput(text, locale) !== (value ?? '')) {
      setText(formatInput(value, locale))
    }
  }, [value, locale, text])

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={labelFor}>
        {label}
        {required ? <RequiredMark /> : null}
      </FieldLabel>
      <div className="relative">
        {currency !== undefined ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
          >
            {currency}
          </span>
        ) : null}
        <Input
          id={labelFor}
          type="text"
          inputMode="decimal"
          required={required}
          aria-invalid={error !== undefined}
          aria-describedby={error !== undefined ? errorId : undefined}
          className={currency !== undefined ? 'pl-12' : undefined}
          value={text}
          onChange={(event) => {
            const raw = event.target.value

            setText(raw)
            onValueChange(parseInput(raw, locale))
          }}
          onBlur={(event) => {
            setText(formatInput(parseInput(text, locale), locale))
            onBlur?.(event)
          }}
          {...inputProps}
        />
      </div>
      <FieldError
        id={errorId}
        errors={error !== undefined ? [error] : undefined}
      />
    </Field>
  )
}
