import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  NativeSelect,
  NativeSelectOption,
} from '@workspace/ui/components/native-select'

/** One choice of the select: its value and the translated label. */
export interface SelectChoice {
  value: string
  label: string
}

/**
 * A labelled native select of the mapping form. A native select keeps a
 * dozen column pickers cheap and keyboard-friendly; the caller passes the
 * choices already translated, and the red `*` shows only for a field the
 * schema always requires.
 */
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
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
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
