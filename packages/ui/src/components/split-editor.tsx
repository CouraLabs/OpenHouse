import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Input } from '@workspace/ui/components/input'

export type SplitEditorMode = 'equal' | 'percentage' | 'exact'

export interface SplitEditorEntry {
  userId: number
  value?: string
}

export interface SplitEditorLabels {
  mode: string
  modes: Record<SplitEditorMode, string>
  valueOf: (name: string) => string
  percentPlaceholder: string
  amountPlaceholder: string
}

export interface SplitEditorProps {
  members: Array<{ id: number; name: string }>
  mode: SplitEditorMode
  entries: SplitEditorEntry[]
  onModeChange: (mode: SplitEditorMode) => void
  onEntriesChange: (entries: SplitEditorEntry[]) => void
  preview?: Record<number, string>
  message?: string
  labels: SplitEditorLabels
  modes?: SplitEditorMode[]
  idPrefix?: string
}

export function SplitEditor({
  members,
  mode,
  entries,
  onModeChange,
  onEntriesChange,
  preview,
  message,
  labels,
  modes = ['equal', 'percentage', 'exact'],
  idPrefix = 'split',
}: SplitEditorProps) {
  const toggle = (userId: number, checked: boolean) =>
    onEntriesChange(
      checked
        ? [...entries, { userId }]
        : entries.filter((entry) => entry.userId !== userId)
    )

  const setValue = (userId: number, value: string) =>
    onEntriesChange(
      entries.map((entry) =>
        entry.userId === userId ? { ...entry, value } : entry
      )
    )

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={labels.mode} className="flex gap-1">
        {modes.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={mode === value ? 'default' : 'outline'}
            aria-pressed={mode === value}
            onClick={() => onModeChange(value)}
          >
            {labels.modes[value]}
          </Button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const entry = entries.find((item) => item.userId === member.id)
          const inputId = `${idPrefix}-value-${member.id}`

          return (
            <li key={member.id} className="flex items-center gap-3">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <Checkbox
                  checked={entry !== undefined}
                  onCheckedChange={(checked) => toggle(member.id, checked)}
                />
                {member.name}
              </label>
              {entry !== undefined && mode !== 'equal' ? (
                <Input
                  id={inputId}
                  inputMode="decimal"
                  className="h-8 w-28"
                  aria-label={labels.valueOf(member.name)}
                  placeholder={
                    mode === 'percentage'
                      ? labels.percentPlaceholder
                      : labels.amountPlaceholder
                  }
                  value={entry.value ?? ''}
                  onChange={(event) =>
                    setValue(member.id, event.target.value.replace(',', '.'))
                  }
                />
              ) : null}
              <span className="w-24 text-right text-sm text-muted-foreground tabular-nums">
                {entry !== undefined ? (preview?.[member.id] ?? '') : ''}
              </span>
            </li>
          )
        })}
      </ul>
      {message !== undefined ? (
        <p className="text-sm text-destructive">{message}</p>
      ) : null}
    </div>
  )
}
