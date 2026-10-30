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

export type FilterFieldType = 'text' | 'number' | 'select'

export interface FilterFieldOption {
  value: string | number
  label: string
}

export interface FilterField {
  key: string
  label: string
  type: FilterFieldType
  placeholder?: string
  options?: FilterFieldOption[]
}

export type FilterValues = Record<string, string | number | undefined>

interface FilterDialogLabels {
  trigger: string
  title: string
  apply: string
  clear: string
  cancel: string
}

interface FilterDialogProps {
  fields: FilterField[]
  values: FilterValues
  onApply: (values: FilterValues) => void
  labels: FilterDialogLabels
}

export function FilterDialog({
  fields,
  values,
  onApply,
  labels,
}: FilterDialogProps) {
  const [open, setOpen] = useState(false)
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
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
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

function toNumber(value: string | number): number | undefined {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}
