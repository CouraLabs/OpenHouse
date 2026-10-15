import type { ComponentProps } from 'react'

import { TextField } from '@workspace/ui/components/text-field'

/**
 * The most digits the field keeps: a `decimal(16,2)` column holds 14 integer
 * digits, and every digit typed is a cent.
 */
const MAX_DIGITS = 16

/** The props `MoneyField` takes. */
interface MoneyFieldProps {
  /** The locale the separators follow — `en-US` shows `1,234.56`. */
  locale: string
  /** The current amount, as a decimal string like `"1.02"`; empty while
   * unset. A Credit balance may lead with `-`. */
  value: string | undefined
  /** What typing does: hands back the amount, as a decimal string. */
  onValueChange: (amount: string) => void
  /** The label above the input. */
  label: string
  labelFor: string
  error?: { message?: string }
  /** Whether the field is required: marks the label with a red asterisk
   * and carries the native `required` attribute for assistive tech. */
  required?: boolean
}

/**
 * One money field of a form, with reverse input masking: every digit typed
 * is a cent, so the field reads right to left. Typing `1` shows `0.01`,
 * then `0` shows `0.10`, then `2` shows `1.02`; backspace removes the last
 * digit, and deleting the last one clears the field entirely — a zero is
 * an empty field, never a value. Typing `-` anywhere toggles the sign, so
 * a Credit balance can be entered negative; the sign vanishes again when
 * the field empties. The separators and grouping come from the locale, so
 * the same entry reads `1,02` in `pt-BR`.
 *
 * The parent form owns the state — pass the canonical decimal string as
 * `value` and receive the next one through `onValueChange`. The math runs
 * on BigInt cents: no digit count this field allows ever crosses a float.
 * The caret jumps to the end after each keystroke; preserving its position
 * is out of scope for now.
 */
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

/** The digits of an amount, at most 16 of them — the cents typed so far. */
function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
}

/**
 * Reads what the user typed into the canonical decimal string: the digits
 * are cents, and a `-` anywhere in what they typed — it survives the
 * re-render at the front — makes the amount negative. All zeros or no
 * digits answer the empty string, so the field can always be cleared.
 */
function parseInput(raw: string): string {
  const negative = raw.includes('-')
  const digits = onlyDigits(raw)

  if (digits === '' || BigInt(digits) === 0n) {
    return ''
  }

  const cents = BigInt(digits)

  return `${negative ? '-' : ''}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

/** The display for a canonical amount: the locale's separators, 2
 * decimals, the leading minus a negative carries — all exact, off the
 * BigInt cents. */
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
  }).format(`${whole}.${fraction}`)

  return text.startsWith('-') ? `-${formatted}` : formatted
}
