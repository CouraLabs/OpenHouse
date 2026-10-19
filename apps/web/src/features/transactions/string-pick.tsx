import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

/**
 * One select field of the form, working in the string domain the Select's
 * generic admits: label, trigger with an explicit label (a prefilled value
 * set while the popup is closed would otherwise fall back to the
 * placeholder), options. The caller converts to and from numbers.
 */
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
  /** Answers with nothing when the empty option — "None" — was picked. */
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
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(rawValue) => {
          const chosen = rawValue as unknown as string

          onChange(chosen === '' ? undefined : chosen)
        }}
      >
        <SelectTrigger id={id}>
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
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
