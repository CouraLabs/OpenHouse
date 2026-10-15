import { cn } from 'cn'
import { TextField } from '@workspace/ui/components/text-field'

/** The color the picker starts from when the value holds no valid hex. */
const FALLBACK_COLOR = '#1D4ED8'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

/** The props `ColorField` takes. */
interface ColorFieldProps {
  /** The label above the text field. */
  label: string
  labelFor: string
  /** The current value, as `#RRGGBB`. */
  value: string
  /** What picking a color does: hands back the hex, uppercased. */
  onChange: (hex: string) => void
  error?: { message?: string }
  /** Whether the field is required: marks the label with a red asterisk
   * and carries the native `required` attribute for assistive tech. */
  required?: boolean
  /** The color the picker shows when the value is not valid hex. */
  fallbackColor?: string
  /** Extra classes for the text input, e.g. a compact height. */
  className?: string
}

/**
 * One color field of a form: the labeled text field first, the picker after
 * it. The text field is readOnly — the picker beside it is the only source
 * of the value — so the alignment and the single source of truth are
 * structural, not conventions every caller re-aligns by hand.
 */
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
