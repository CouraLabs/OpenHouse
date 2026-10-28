import { useTranslation } from 'react-i18next'
import type { Currency, SplitInput } from '@workspace/poco'
import { resolveSplit } from '@workspace/poco'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  SplitEditor,
  type SplitEditorEntry,
  type SplitEditorMode,
} from '@workspace/ui/components/split-editor'

import { formatMoney } from '@/lib/format-money.js'
import { useHouseholdMembers } from '@/lib/household.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The props `SplitSection` takes. */
interface SplitSectionProps {
  /** How the record is shared, or nothing while it is not split. */
  value: SplitInput | null
  onChange: (value: SplitInput | null) => void
  /** The amount to preview the shares of; nothing for a default split that
   * applies to any amount (a category's). */
  amount?: string
  currency: Currency
  /** Who holds the remainder cents; the preview matches the API's. */
  payerUserId: number | null
  /** Offer exact amounts — a split with no fixed amount cannot use them. */
  allowExact?: boolean
  idPrefix: string
}

/**
 * The split of a form: a checkbox that turns sharing on, and the editor
 * (equal, percentage, exact) with the shares previewed from the same poco
 * math the API runs. Shared by the transaction, category, and recurring-rule
 * forms, so it reads the members and the translations itself.
 */
export function SplitSection({
  value,
  onChange,
  amount,
  currency,
  payerUserId,
  allowExact = true,
  idPrefix,
}: SplitSectionProps) {
  const { t } = useTranslation()
  const members = useHouseholdMembers()
  // A removed member cannot take a new share; one already in the split
  // stays listed so the row still reads.
  const listed = (members.data ?? []).filter(
    (member) =>
      member.isActive ||
      value?.entries.some((entry) => entry.userId === member.id) === true
  )

  const enable = () =>
    onChange({
      mode: 'equal',
      entries: listed
        .filter((member) => member.isActive)
        .map((member) => ({ userId: member.id })),
    })

  const preview: Record<number, string> = {}
  let message: string | undefined

  if (value !== null) {
    if (amount !== undefined && amount !== '') {
      try {
        const result = resolveSplit(amount, value, payerUserId)

        if (result.ok) {
          for (const share of result.shares) {
            preview[share.userId] = formatMoney(
              share.share,
              formattingLocale(),
              currency
            )
          }
        } else if (value.entries.every((entry) => entry.value !== '')) {
          message = t(`split.error.${value.mode}`)
        }
      } catch {
        // A value still being typed ("1.") has no cents yet.
      }
    } else if (value.mode === 'exact') {
      for (const entry of value.entries) {
        try {
          preview[entry.userId] = formatMoney(
            entry.value ?? '0',
            formattingLocale(),
            currency
          )
        } catch {
          // Incomplete number; nothing to show yet.
        }
      }
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-enabled`}>
        <Checkbox
          id={`${idPrefix}-enabled`}
          checked={value !== null}
          onCheckedChange={(checked) => (checked ? enable() : onChange(null))}
        />
        {t('split.enable')}
      </FieldLabel>
      {value !== null ? (
        <SplitEditor
          idPrefix={idPrefix}
          members={listed.map((member) => ({
            id: member.id,
            name: member.name,
          }))}
          mode={value.mode}
          entries={value.entries as SplitEditorEntry[]}
          modes={
            allowExact
              ? ['equal', 'percentage', 'exact']
              : (['equal', 'percentage'] as SplitEditorMode[])
          }
          onModeChange={(mode) =>
            onChange({
              mode,
              entries: value.entries.map((entry) => ({
                userId: entry.userId,
              })),
            })
          }
          onEntriesChange={(entries) => onChange({ ...value, entries })}
          preview={preview}
          message={message}
          labels={{
            mode: t('split.mode'),
            modes: {
              equal: t('split.mode-equal'),
              percentage: t('split.mode-percentage'),
              exact: t('split.mode-exact'),
            },
            valueOf: (name) => t('split.value-of', { name }),
            percentPlaceholder: t('split.percent-placeholder'),
            amountPlaceholder: t('split.amount-placeholder'),
          }}
        />
      ) : null}
    </Field>
  )
}
