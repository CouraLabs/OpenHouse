import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Switch } from '@workspace/ui/components/switch'

export function SwitchField({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description !== undefined ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </Field>
  )
}
