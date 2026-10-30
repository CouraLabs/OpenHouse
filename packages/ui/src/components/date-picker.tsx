'use client'

import * as React from 'react'
import { cn } from 'cn'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Calendar } from '@workspace/ui/components/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { toDateFnsLocale } from '@workspace/ui/lib/date-fns-locale'

export interface DatePickerLabels {
  placeholder: string
  today: string
}

export interface DatePickerProps {
  value: Date | undefined
  onChange: (date: Date) => void
  locale: string
  labels: DatePickerLabels
  disabledBefore?: Date
  id?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  locale,
  labels,
  disabledBefore,
  id,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const calendarLocale = React.useMemo(() => toDateFnsLocale(locale), [locale])
  const now = new Date()

  const label = value
    ? new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(value)
    : labels.placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            aria-haspopup="dialog"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="text-muted-foreground" />
            {label}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (date) {
              onChange(date)
              setOpen(false)
            }
          }}
          captionLayout="dropdown"
          startMonth={
            disabledBefore &&
            disabledBefore > new Date(now.getFullYear() - 50, 0, 1)
              ? new Date(
                  disabledBefore.getFullYear(),
                  disabledBefore.getMonth(),
                  1
                )
              : new Date(now.getFullYear() - 50, 0, 1)
          }
          endMonth={new Date(now.getFullYear() + 50, 11, 1)}
          disabled={[
            ...(disabled ? [true as const] : []),
            ...(disabledBefore ? [{ before: disabledBefore }] : []),
          ]}
          locale={calendarLocale}
          footer={
            <div className="border-t border-border px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange(new Date())
                  setOpen(false)
                }}
              >
                {labels.today}
              </Button>
            </div>
          }
        />
      </PopoverContent>
    </Popover>
  )
}
