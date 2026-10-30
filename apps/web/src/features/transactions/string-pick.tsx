import { RequiredMark } from '@workspace/ui/components/required-mark'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

export function StringPick({
  id,
  label,
  required = false,
  value,
  placeholder,
  onChange,
  options,
  error,
  disabled = false,
}: {
  id: string
  label: string
  required?: boolean
  value: string | undefined
  placeholder: string
  onChange: (value: string | undefined) => void
  options: Array<{ value: string; label: string }>
  error?: string
  disabled?: boolean
}) {
  const selected = options.find((option) => option.value === value)

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </FieldLabel>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(rawValue) => {
          const chosen = rawValue as unknown as string

          onChange(chosen === '' ? undefined : chosen)
        }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={error !== undefined}
          aria-required={required}
          aria-describedby={error !== undefined ? `${id}-error` : undefined}
        >
          <SelectValue>
            {selected === undefined ? placeholder : selected.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.label} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error !== undefined ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : null}
    </Field>
  )
}
