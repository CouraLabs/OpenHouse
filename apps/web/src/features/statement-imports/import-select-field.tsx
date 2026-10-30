import { RequiredMark } from '@workspace/ui/components/required-mark'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  NativeSelect,
  NativeSelectOption,
} from '@workspace/ui/components/native-select'

export interface SelectChoice {
  value: string
  label: string
}

export function ImportSelectField({
  id,
  label,
  value,
  choices,
  error,
  required = false,
  onChange,
}: {
  id: string
  label: string
  value: string
  choices: SelectChoice[]
  error?: string
  required?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        aria-invalid={error !== undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {choices.map((choice) => (
          <NativeSelectOption key={choice.value} value={choice.value}>
            {choice.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
