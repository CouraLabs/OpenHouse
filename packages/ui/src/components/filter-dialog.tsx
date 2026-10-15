import { useState } from 'react'
import { Funnel } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TextField } from '@workspace/ui/components/text-field'
import { cn } from 'cn'

/** The data types a filter field can hold. */
export type FilterFieldType = 'text' | 'number' | 'select'

/** One option a `select` filter field offers. */
export interface FilterFieldOption {
  value: string | number
  label: string
}

/** One field of the filter dialog, described by the entity that owns it. */
export interface FilterField {
  key: string
  label: string
  type: FilterFieldType
  /** Shown while the field holds nothing. */
  placeholder?: string
  /** The choices a `select` field offers. */
  options?: FilterFieldOption[]
}

/** The values a filter holds: one entry per field, absent when unset. */
export type FilterValues = Record<string, string | number | undefined>

/** The labels the dialog reads, all translated by the caller. */
interface FilterDialogLabels {
  /** The trigger's aria-label and title. */
  trigger: string
  title: string
  apply: string
  clear: string
  cancel: string
}

interface FilterDialogProps {
  /** The fields the entity filters on, in display order. */
  fields: FilterField[]
  /** The applied values; the trigger shows how many are set. */
  values: FilterValues
  /** What applying does: receives the values, unset fields dropped. */
  onApply: (values: FilterValues) => void
  labels: FilterDialogLabels
}

/**
 * The toolbar filter of a data table: an icon button that opens a dialog
 * where the entity's fields are filled in. The entity describes its fields
 * (`text`, `number`, or `select`) and their choices; the dialog owns only
 * the draft editing and the apply/clear mechanics — the caller translates
 * every label and decides what the applied values filter.
 */
export function FilterDialog({
  fields,
  values,
  onApply,
  labels,
}: FilterDialogProps) {
  const [open, setOpen] = useState(false)
  // The dialog edits a draft; applying commits it. Empty strings count as
  // unset, so a cleared text field drops out of the applied values.
  const [draft, setDraft] = useState<FilterValues>({})

  const activeCount = fields.filter(
    (field) => values[field.key] !== undefined
  ).length

  const openDialog = () => {
    setDraft(
      Object.fromEntries(fields.map((field) => [field.key, values[field.key]]))
    )
    setOpen(true)
  }

  const apply = (next: FilterValues) => {
    setOpen(false)
    onApply(cleanValues(fields, next))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          openDialog()
        } else {
          setOpen(false)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={labels.trigger}
            title={labels.trigger}
          >
            <Funnel />
            {activeCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
              >
                {activeCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={draft[field.key]}
              onChange={(value) =>
                setDraft((current) => ({ ...current, [field.key]: value }))
              }
            />
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="mr-auto"
            disabled={activeCount === 0}
            onClick={() => apply({})}
          >
            {labels.clear}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {labels.cancel}
          </Button>
          <Button type="button" onClick={() => apply(draft)}>
            {labels.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The input of one filter field, shaped by its data type. */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FilterField
  value: string | number | undefined
  onChange: (value: string | number | undefined) => void
}) {
  const id = `filter-${field.key}`

  if (field.type === 'select') {
    const selected = field.options?.find((option) => option.value === value)

    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <Select
          // The runtime compares raw values (numbers included); the prop's
          // default generic only admits strings, so the boundary is cast.
          value={value as string | undefined}
          onValueChange={(next) =>
            onChange((next as string | number) ?? undefined)
          }
          items={field.options ?? []}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={field.placeholder}>
              {selected?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={String(option.value)} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    )
  }

  return (
    <TextField
      type="text"
      label={field.label}
      labelFor={id}
      placeholder={field.placeholder}
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      value={value === undefined ? '' : String(value)}
      onChange={(event) =>
        onChange(event.target.value === '' ? undefined : event.target.value)
      }
      className={cn(field.type === 'number' && 'tabular-nums')}
    />
  )
}

/** Drops the empty entries and converts number fields, so the applied
 * values match what a wire filter schema expects: absent means unfiltered. */
function cleanValues(
  fields: FilterField[],
  values: FilterValues
): FilterValues {
  const cleaned: FilterValues = {}

  for (const field of fields) {
    const value = values[field.key]

    if (value === undefined || value === '') {
      continue
    }

    cleaned[field.key] = field.type === 'number' ? toNumber(value) : value
  }

  return cleaned
}

/** The numeric value of an entry, or nothing when it is not a number. */
function toNumber(value: string | number): number | undefined {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}
