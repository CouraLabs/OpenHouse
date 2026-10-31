import type { FieldError as FormFieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'

import { DayOfMonthPick } from './day-of-month-pick.js'
import { useAccountPreview } from './use-accounts.js'

export function CardCycleFields({
  closeDay,
  dueDay,
  closeDayInclusive,
  onCloseDayChange,
  onDueDayChange,
  onCloseDayInclusiveChange,
  errors,
}: {
  closeDay: number | null | undefined
  dueDay: number | null | undefined
  closeDayInclusive: boolean
  onCloseDayChange: (day: number | null) => void
  onDueDayChange: (day: number | null) => void
  onCloseDayInclusiveChange: (inclusive: boolean) => void
  errors: { closeDay?: FormFieldError; dueDay?: FormFieldError }
}) {
  const { t } = useTranslation()
  const bothSet = closeDay != null && dueDay != null
  const preview = useAccountPreview(
    { closeDay: closeDay ?? null, dueDay: dueDay ?? null },
    bothSet
  )
  const gap = bothSet ? (preview.data?.cycleGapWarning ?? null) : null

  return (
    <>
      <DayOfMonthPick
        id="account-close-day"
        label={t('accounts.close-date')}
        placeholder={t('accounts.day-placeholder')}
        value={closeDay}
        onChange={onCloseDayChange}
        error={errors.closeDay}
        required
      />
      <DayOfMonthPick
        id="account-due-day"
        label={t('accounts.due-date')}
        placeholder={t('accounts.day-placeholder')}
        value={dueDay}
        onChange={onDueDayChange}
        error={errors.dueDay}
        required
      />
      <Field orientation="horizontal">
        <Checkbox
          id="account-close-day-inclusive"
          checked={closeDayInclusive}
          onCheckedChange={(checked) =>
            onCloseDayInclusiveChange(checked === true)
          }
        />
        <FieldLabel htmlFor="account-close-day-inclusive">
          {t('accounts.close-day-inclusive')}
        </FieldLabel>
      </Field>
      {gap !== null ? (
        <p role="alert" className="col-span-full text-sm text-muted-foreground">
          {t(`accounts.cycle-gap-${gap}`)}
        </p>
      ) : null}
    </>
  )
}
