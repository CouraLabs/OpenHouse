import { Input } from '@workspace/ui/components/input'

const MAX_DAY = 31

export function MonthDayInput({
  id,
  value,
  placeholder,
  invalid,
  onChange,
}: {
  id: string
  value: number | undefined
  placeholder: string
  invalid: boolean
  onChange: (value: number | undefined) => void
}) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={2}
      placeholder={placeholder}
      aria-invalid={invalid}
      value={value === undefined ? '' : String(value)}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '')

        if (digits === '') {
          onChange(undefined)

          return
        }

        const day = Number(digits)

        if (day <= MAX_DAY) {
          onChange(day)
        }
      }}
    />
  )
}
