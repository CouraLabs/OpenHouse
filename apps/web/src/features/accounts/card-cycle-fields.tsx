import type { FieldError as FormFieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { cycleDaysDiffer, cycleGapWarning } from '@workspace/poco'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'

import { DayOfMonthPick } from './day-of-month-pick.js'

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
  const sameDay = bothSet && !cycleDaysDiffer(closeDay, dueDay)
  const gap = bothSet && !sameDay ? cycleGapWarning(closeDay, dueDay) : null

  return (
    <>
      <DayOfMonthPick
        id="account-close-day"
        label={t('accounts.close-date')}
        placeholder={t('accounts.day-placeholder')}
        value={closeDay}
        onChange={onCloseDayChange}
        error={errors.closeDay}
      />
      <DayOfMonthPick
        id="account-due-day"
        label={t('accounts.due-date')}
        placeholder={t('accounts.day-placeholder')}
        value={dueDay}
        onChange={onDueDayChange}
        error={errors.dueDay}
      />
      <Field>
        <FieldLabel htmlFor="account-close-day-inclusive">
          {t('accounts.close-day-inclusive')}
        </FieldLabel>
        <Checkbox
          id="account-close-day-inclusive"
          className="mt-1"
          checked={closeDayInclusive}
          onCheckedChange={(checked) =>
            onCloseDayInclusiveChange(checked === true)
          }
        />
      </Field>
      {sameDay || gap !== null ? (
        <p
          className={`col-span-full text-sm ${sameDay ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {sameDay
            ? t('accounts.cycle-days-equal')
            : t(`accounts.cycle-gap-${gap}`)}
        </p>
      ) : null}
    </>
  )
}
