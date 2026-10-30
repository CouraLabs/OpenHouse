import { cn } from 'cn'
import { TextField } from '@workspace/ui/components/text-field'

const FALLBACK_COLOR = '#1D4ED8'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

interface ColorFieldProps {
  label: string
  labelFor: string
  value: string
  onChange: (hex: string) => void
  error?: { message?: string }
  required?: boolean
  fallbackColor?: string
  className?: string
}

export function ColorField({
  label,
  labelFor,
  value,
  onChange,
  error,
  required,
  fallbackColor = FALLBACK_COLOR,
  className,
}: ColorFieldProps) {
  return (
    <div className="flex items-end gap-2">
      <TextField
        type="text"
        label={label}
        labelFor={labelFor}
        placeholder={fallbackColor}
        className={cn('h-8 w-28 font-mono uppercase', className)}
        required={required}
        error={error}
        readOnly
        value={value}
        onChange={() => {}}
      />
      <input
        type="color"
        aria-label={label}
        className="size-8 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
        value={HEX_PATTERN.test(value) ? value : fallbackColor}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </div>
  )
}
