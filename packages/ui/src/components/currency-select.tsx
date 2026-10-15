'use client'

import { cn } from 'cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

/**
 * The flag every currency renders beside its code. `EUR` has no country —
 * the flag of the European Union stands for it.
 */
export const currencyFlags: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}',
  BRL: '\u{1F1E7}\u{1F1F7}',
  EUR: '\u{1F1EA}\u{1F1FA}',
}

/** The props `CurrencySelect` takes. */
export interface CurrencySelectProps {
  /** The chosen currency code, or nothing while unset. */
  value: string | undefined
  /** Called with the picked currency code. */
  onValueChange: (value: string) => void
  /** The codes to offer, in display order. */
  codes: readonly string[]
  /** The display name per code, translated by the caller. */
  labels: Record<string, string>
  placeholder: string
  id?: string
  disabled?: boolean
  /** Marks the trigger invalid while the form reports an error on the field. */
  invalid?: boolean
  className?: string
}

/**
 * A dropdown of currencies, each option showing its country flag beside the
 * code, and the picked one showing flag, code and name in the trigger.
 * Label-agnostic — the names arrive translated from the caller; the flags
 * are universal.
 */
export function CurrencySelect({
  value,
  onValueChange,
  codes,
  labels,
  placeholder,
  id,
  disabled,
  invalid,
  className,
}: CurrencySelectProps) {
  // The trigger's label is rendered here, not derived by base-ui from
  // `items`: a prefilled value set while the popup is closed would
  // otherwise fall back to the placeholder.
  const selected = value !== undefined ? labels[value] : undefined

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        // Clearing is not an option a currency picker offers.
        if (next !== null) {
          onValueChange(next)
        }
      }}
      items={codes.map((code) => ({ label: labels[code], value: code }))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn('w-full', className)}
        size="sm"
        aria-invalid={invalid}
      >
        <SelectValue placeholder={placeholder}>
          {value !== undefined && selected !== undefined ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">{currencyFlags[value] ?? ''}</span>
              <span>{value}</span>
              <span className="text-muted-foreground">· {selected}</span>
            </span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {codes.map((code) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{currencyFlags[code] ?? ''}</span>
              <span className="font-medium">{code}</span>
              <span className="text-muted-foreground">{labels[code]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
