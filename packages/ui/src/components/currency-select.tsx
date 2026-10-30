'use client'

import { cn } from 'cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

export const currencyFlags: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}',
  BRL: '\u{1F1E7}\u{1F1F7}',
  EUR: '\u{1F1EA}\u{1F1FA}',
}

export interface CurrencySelectProps {
  value: string | undefined
  onValueChange: (value: string) => void
  codes: readonly string[]
  labels: Record<string, string>
  placeholder: string
  id?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

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
  const selected = value !== undefined ? labels[value] : undefined

  return (
    <Select
      value={value}
      onValueChange={(next) => {
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
