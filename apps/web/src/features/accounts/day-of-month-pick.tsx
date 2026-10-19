import type { FieldError as FormFieldError } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

/** The days of the month a close or due date can fall on. */
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1)

/** A labeled pick of a day of the month, 01–31, or none yet. */
export function DayOfMonthPick({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  placeholder: string
  value: number | null | undefined
  onChange: (day: number | null) => void
  error?: FormFieldError
}) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
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
          {/* The selected label renders explicitly — a value set while the
              popup was closed is not derived from the items alone. */}
          <SelectValue placeholder={placeholder}>
            {value != null ? String(value).padStart(2, '0') : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DAYS_OF_MONTH.map((day) => (
            <SelectItem key={day} value={String(day)}>
              {String(day).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={error !== undefined ? [error] : undefined} />
    </Field>
  )
}
