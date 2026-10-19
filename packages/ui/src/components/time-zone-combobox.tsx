'use client'

import { cn } from 'cn'
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@workspace/ui/components/combobox'

/** One zone the picker offers: the IANA name and its offset-led label. */
interface TimeZoneOption {
  value: string
  label: string
}

/** The zones of one region (`America`, `Europe`, …), in label order. */
interface TimeZoneGroup {
  value: string
  items: TimeZoneOption[]
}

/** The grouped options, built once — ~400 formatters are not free. */
let cachedGroups: TimeZoneGroup[] | undefined

/**
 * The zone's current offset as `UTC−03:00`. `longOffset` answers `GMT-03:00`
 * (or a bare `GMT` at zero); the minus becomes a typographic one.
 */
function offsetOf(timeZone: string, now: Date): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const offset = name === 'GMT' ? '+00:00' : name.slice(3)

  return `UTC${offset.replace('-', '−')}`
}

/** The IANA zones grouped by region, each labelled `(UTC−03:00) Sao Paulo`. */
function timeZoneGroups(): TimeZoneGroup[] {
  if (cachedGroups !== undefined) {
    return cachedGroups
  }

  const now = new Date()
  const byRegion = new Map<string, TimeZoneOption[]>()

  for (const zone of Intl.supportedValuesOf('timeZone')) {
    const [region = zone, ...rest] = zone.split('/')
    const city = (rest.length > 0 ? rest.join(' / ') : zone).replaceAll(
      '_',
      ' '
    )
    const options = byRegion.get(region) ?? []
    options.push({ value: zone, label: `(${offsetOf(zone, now)}) ${city}` })
    byRegion.set(region, options)
  }

  cachedGroups = [
    { value: 'UTC', items: [{ value: 'UTC', label: '(UTC+00:00) UTC' }] },
    ...[...byRegion.entries()]
      .filter(([region]) => region !== 'UTC')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, items]) => ({
        value: region,
        items: items.sort((a, b) => a.label.localeCompare(b.label)),
      })),
  ]

  return cachedGroups
}

/** The props `TimeZoneCombobox` takes. */
export interface TimeZoneComboboxProps {
  /** The chosen IANA zone, or nothing while unset. */
  value: string | undefined
  /** Called with the picked IANA zone. */
  onValueChange: (value: string) => void
  /** The search input's placeholder, translated by the caller. */
  placeholder: string
  /** What the list says when the search matches nothing. */
  emptyLabel: string
  id?: string
  disabled?: boolean
  /** Marks the input invalid while the form reports an error on the field. */
  invalid?: boolean
  className?: string
}

/**
 * A searchable picker of IANA time zones, grouped by region, each option led
 * by the zone's current UTC offset. Label-agnostic: the placeholder and the
 * empty message arrive translated; zone names are IANA identifiers.
 */
export function TimeZoneCombobox({
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  id,
  disabled,
  invalid,
  className,
}: TimeZoneComboboxProps) {
  const groups = timeZoneGroups()
  const selected =
    value === undefined
      ? null
      : (groups
          .flatMap((group) => group.items)
          .find((option) => option.value === value) ?? null)

  return (
    <Combobox
      items={groups}
      value={selected}
      onValueChange={(next: TimeZoneOption | null) => {
        // Clearing is not an option a time zone picker offers.
        if (next !== null) {
          onValueChange(next.value)
        }
      }}
      isItemEqualToValue={(item: TimeZoneOption, current: TimeZoneOption) =>
        item.value === current.value
      }
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        className={cn('w-full', className)}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(group: TimeZoneGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(option: TimeZoneOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
