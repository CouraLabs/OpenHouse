import type { FieldError as FormFieldError } from 'react-hook-form'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1)

export function DayOfMonthPick({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
}: {
  id: string
  label: string
  placeholder: string
  value: number | null | undefined
  onChange: (day: number | null) => void
  error?: FormFieldError
  required?: boolean
}) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </FieldLabel>
      <Select
        value={value == null ? null : String(value)}
        onValueChange={(day) => onChange(day === null ? null : Number(day))}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          size="sm"
          aria-invalid={error !== undefined}
        >
          <SelectValue placeholder={placeholder}>
            {value != null ? String(value).padStart(2, '0') : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DAYS_OF_MONTH.map((day) => (
            <SelectItem key={day} value={String(day)} label={String(day)}>
              {String(day).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={error !== undefined ? [error] : undefined} />
    </Field>
  )
}
