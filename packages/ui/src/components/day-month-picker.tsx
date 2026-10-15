'use client'

import { cn } from 'cn'

import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

/** One localized month option the caller builds and hands over. */
export interface DayMonthOption {
  value: number
  label: string
}

/** The strings the picker cannot derive — every user-facing label arrives translated. */
export interface DayMonthPickerLabels {
  day: string
  month: string
  dayPlaceholder: string
  monthPlaceholder: string
}

export interface DayMonthPickerProps {
  /** The selected day of the month, 1–31, or nothing. */
  day: number | null
  /** The selected month, 1–12, or nothing. */
  month: number | null
  onDayChange: (day: number | null) => void
  onMonthChange: (month: number | null) => void
  /** The month names, localized by the caller. */
  monthOptions: DayMonthOption[]
  labels: DayMonthPickerLabels
  id?: string
  disabled?: boolean
  className?: string
}

/**
 * A month/day picker: two dropdowns, no calendar grid — for dates that carry
 * no year, like a credit card's close and due days. Label-agnostic: the day
 * numbers are locale-free, the month names arrive from the caller.
 */
export function DayMonthPicker({
  day,
  month,
  onDayChange,
  onMonthChange,
  monthOptions,
  labels,
  id,
  disabled,
  className,
}: DayMonthPickerProps) {
  const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1)

  return (
    <div className={cn('flex gap-3', className)}>
      <Field className="flex-1">
        <FieldLabel htmlFor={id === undefined ? undefined : `${id}-day`}>
          {labels.day}
        </FieldLabel>
        <Select
          value={day === null ? null : String(day)}
          onValueChange={(value) =>
            onDayChange(value === null ? null : Number(value))
          }
          disabled={disabled}
        >
          <SelectTrigger
            id={id === undefined ? undefined : `${id}-day`}
            className="w-full"
          >
            {/* The selected label renders explicitly — a value set while the
                popup was closed is not derived from the items alone. */}
            <SelectValue>
              {day === null ? (
                <span className="text-muted-foreground">
                  {labels.dayPlaceholder}
                </span>
              ) : (
                String(day).padStart(2, '0')
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {dayOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {String(option).padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="flex-1">
        <FieldLabel htmlFor={id === undefined ? undefined : `${id}-month`}>
          {labels.month}
        </FieldLabel>
        <Select
          value={month === null ? null : String(month)}
          onValueChange={(value) =>
            onMonthChange(value === null ? null : Number(value))
          }
          disabled={disabled}
        >
          <SelectTrigger
            id={id === undefined ? undefined : `${id}-month`}
            className="w-full"
          >
            <SelectValue>
              {month === null ? (
                <span className="text-muted-foreground">
                  {labels.monthPlaceholder}
                </span>
              ) : (
                (monthOptions.find((option) => option.value === month)?.label ??
                String(month).padStart(2, '0'))
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
