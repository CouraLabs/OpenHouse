import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Input } from '@workspace/ui/components/input'

/** How an expense is shared between members. */
export type SplitEditorMode = 'equal' | 'percentage' | 'exact'

/** One member taking part in the split; `value` is the percent or amount
 * typed (nothing for an equal split). */
export interface SplitEditorEntry {
  userId: number
  value?: string
}

/** The words the editor shows, translated by the caller. */
export interface SplitEditorLabels {
  /** Names the mode switch for assistive tech. */
  mode: string
  modes: Record<SplitEditorMode, string>
  /** Names the value input of a member, e.g. "Bruno's share". */
  valueOf: (name: string) => string
  percentPlaceholder: string
  amountPlaceholder: string
}

/** The props `SplitEditor` takes. */
export interface SplitEditorProps {
  /** Who the expense can be shared with. */
  members: Array<{ id: number; name: string }>
  mode: SplitEditorMode
  /** The members taking part, in any order. */
  entries: SplitEditorEntry[]
  onModeChange: (mode: SplitEditorMode) => void
  onEntriesChange: (entries: SplitEditorEntry[]) => void
  /** The resolved share of each member, already formatted for display. */
  preview?: Record<number, string>
  /** Why the split does not fit yet (percentages off 100, amounts off the
   * total), or nothing. */
  message?: string
  labels: SplitEditorLabels
  /** The modes offered; all three when left out. */
  modes?: SplitEditorMode[]
  idPrefix?: string
}

/**
 * Splits an expense between members: a mode switch (equal, percentage,
 * exact), a checkbox per member, and a value input per chosen member for the
 * non-equal modes. The caller owns the state and the math, and passes the
 * resolved `preview` strings; every word arrives through `labels`.
 */
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
