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

interface TimeZoneOption {
  value: string
  label: string
}

interface TimeZoneGroup {
  value: string
  items: TimeZoneOption[]
}

let cachedGroups: TimeZoneGroup[] | undefined

function offsetOf(timeZone: string, now: Date): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const offset = name === 'GMT' ? '+00:00' : name.slice(3)

  return `UTC${offset.replace('-', '−')}`
}

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

export interface TimeZoneComboboxProps {
  value: string | undefined
  onValueChange: (value: string) => void
  placeholder: string
  emptyLabel: string
  id?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

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
