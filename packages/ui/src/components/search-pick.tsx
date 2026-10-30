import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@workspace/ui/components/combobox'
import { RequiredMark } from '@workspace/ui/components/required-mark'

export interface SearchPickOption {
  value: string
  label: string
}

export interface SearchPickProps {
  id: string
  label: string
  placeholder: string
  emptyLabel: string
  value: string | undefined
  options: SearchPickOption[]
  onChange: (value: string | undefined) => void
  required?: boolean
  disabled?: boolean
  error?: string
}

export function SearchPick({
  id,
  label,
  placeholder,
  emptyLabel,
  value,
  options,
  onChange,
  required = false,
  disabled = false,
  error,
}: SearchPickProps) {
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </FieldLabel>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(next: SearchPickOption | null) =>
          onChange(next === null || next.value === '' ? undefined : next.value)
        }
        isItemEqualToValue={(
          item: SearchPickOption,
          current: SearchPickOption
        ) => item.value === current.value}
        disabled={disabled}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          showClear={!required && selected !== null}
          aria-invalid={error !== undefined}
          aria-required={required}
          aria-describedby={error !== undefined ? `${id}-error` : undefined}
          className="w-full"
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxList>
            {(option: SearchPickOption) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error !== undefined ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : null}
    </Field>
  )
}
