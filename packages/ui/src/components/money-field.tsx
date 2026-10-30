import type { ComponentProps } from 'react'

import { TextField } from '@workspace/ui/components/text-field'

const MAX_DIGITS = 16

interface MoneyFieldProps {
  locale: string
  value: string | undefined
  onValueChange: (amount: string) => void
  label: string
  labelFor: string
  error?: { message?: string }
  required?: boolean
}

export function MoneyField({
  locale,
  value,
  onValueChange,
  label,
  labelFor,
  error,
  required,
  ...inputProps
}: MoneyFieldProps &
  Omit<
    ComponentProps<typeof TextField>,
    'type' | 'id' | 'label' | 'value' | 'onChange'
  >) {
  return (
    <TextField
      type="text"
      label={label}
      labelFor={labelFor}
      error={error}
      required={required}
      inputMode="decimal"
      value={toDisplay(value, locale)}
      onChange={(event) => {
        onValueChange(parseInput(event.target.value))
      }}
      {...inputProps}
    />
  )
}

function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
}

function parseInput(raw: string): string {
  const negative = raw.includes('-')
  const digits = onlyDigits(raw)

  if (digits === '' || BigInt(digits) === 0n) {
    return ''
  }

  const cents = BigInt(digits)

  return `${negative ? '-' : ''}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

function toDisplay(value: string | undefined, locale: string): string {
  const text = value ?? ''
  const digits = onlyDigits(text)

  if (digits === '' || BigInt(digits) === 0n) {
    return ''
  }

  const cents = BigInt(digits)
  const whole = cents / 100n
  const fraction = String(cents % 100n).padStart(2, '0')
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(`${whole}.${fraction}`))

  return text.startsWith('-') ? `-${formatted}` : formatted
}
