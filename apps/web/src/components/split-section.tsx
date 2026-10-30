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

interface SplitSectionProps {
  value: SplitInput | null
  onChange: (value: SplitInput | null) => void
  amount?: string
  currency: Currency
  payerUserId: number | null
  allowExact?: boolean
  idPrefix: string
}

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
