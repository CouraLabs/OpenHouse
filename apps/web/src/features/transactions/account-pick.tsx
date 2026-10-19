import type { AccountRef } from '@workspace/poco'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

/** One account select: label, trigger with an explicit label, options. */
export function AccountPick({
  id,
  label,
  placeholder,
  value,
  options,
  error,
  onChange,
}: {
  id: string
  label: string
  placeholder: string
  value: number | undefined
  options: AccountRef[]
  error?: string
  onChange: (value: number) => void
}) {
  const selected = options.find((option) => option.id === value)

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(rawValue) =>
          onChange(Number(rawValue as unknown as string))
        }
      >
        <SelectTrigger id={id}>
          <SelectValue>
            {selected === undefined ? placeholder : selected.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id as unknown as string}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
