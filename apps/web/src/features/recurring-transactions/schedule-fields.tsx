import { useTranslation } from 'react-i18next'
import type { FieldErrors } from 'react-hook-form'
import type { CreateRecurringTransactionBody, Frequency } from '@workspace/poco'
import { frequencies, nextOccurrence } from '@workspace/poco'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { FormSection } from '@workspace/ui/components/form-section'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formattingLocale } from '@/lib/i18n.js'
import { readFrequency } from './recurring-transactions-columns.js'

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

export function ScheduleFields({
  frequency,
  frequencyDay,
  frequencyMonth,
  today,
  errors,
  onFrequencyChange,
  onDayChange,
  onMonthChange,
}: {
  frequency: Frequency | undefined
  frequencyDay: number | undefined
  frequencyMonth: number | undefined
  today: string
  errors: FieldErrors<CreateRecurringTransactionBody>
  onFrequencyChange: (value: Frequency) => void
  onDayChange: (value: number) => void
  onMonthChange: (value: number) => void
}) {
  const { t } = useTranslation()
  const locale = formattingLocale()
  const monthName = (month: number) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      new Date(2026, month - 1, 1)
    )
  const dayOptions =
    frequency === 'Weekly'
      ? Array.from({ length: 7 }, (_, index) => index + 1)
      : Array.from({ length: 31 }, (_, index) => index + 1)
  const rule =
    frequency === undefined
      ? null
      : {
          frequency,
          frequencyDay: frequencyDay ?? null,
          frequencyMonth: frequencyMonth ?? null,
        }
  const next = rule === null ? null : nextOccurrence(rule, today)

  return (
    <FormSection legend={t('recurring.schedule')}>
      <Field data-invalid={errors.frequency !== undefined}>
        <FieldLabel htmlFor="recurring-frequency">
          {t('recurring.frequency')}
          <RequiredMark />
        </FieldLabel>
        <Select
          value={frequency}
          onValueChange={(value) => onFrequencyChange(value as Frequency)}
        >
          <SelectTrigger id="recurring-frequency">
            <SelectValue>
              {frequency === undefined
                ? t('recurring.frequency-placeholder')
                : t(`recurring.frequency-${frequency.toLowerCase()}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {frequencies.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`recurring.frequency-${value.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.frequency !== undefined ? (
          <FieldError>{errors.frequency.message}</FieldError>
        ) : null}
      </Field>
      {frequency === 'Yearly' ? (
        <Field data-invalid={errors.frequencyMonth !== undefined}>
          <FieldLabel htmlFor="recurring-frequency-month">
            {t('recurring.frequency-month')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={frequencyMonth}
            onValueChange={(value) => onMonthChange(Number(value))}
          >
            <SelectTrigger id="recurring-frequency-month">
              <SelectValue>
                {frequencyMonth === undefined
                  ? t('recurring.frequency-month-placeholder')
                  : monthName(frequencyMonth)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {monthName(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frequencyMonth !== undefined ? (
            <FieldError>{errors.frequencyMonth.message}</FieldError>
          ) : null}
        </Field>
      ) : null}
      {frequency !== undefined && frequency !== 'Daily' ? (
        <Field data-invalid={errors.frequencyDay !== undefined}>
          <FieldLabel htmlFor="recurring-frequency-day">
            {t('recurring.frequency-day')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={frequencyDay}
            onValueChange={(value) => onDayChange(Number(value))}
          >
            <SelectTrigger id="recurring-frequency-day">
              <SelectValue>
                {frequencyDay === undefined
                  ? t('recurring.frequency-day-placeholder')
                  : frequency === 'Weekly'
                    ? t(`recurring.weekday-${frequencyDay}`)
                    : String(frequencyDay)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((day) => (
                <SelectItem key={day} value={day}>
                  {frequency === 'Weekly'
                    ? t(`recurring.weekday-${day}`)
                    : String(day)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frequencyDay !== undefined ? (
            <FieldError>{errors.frequencyDay.message}</FieldError>
          ) : null}
        </Field>
      ) : null}
      {rule !== null ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {next === null
            ? t('recurring.no-next-run')
            : `${readFrequency(t, rule)} · ${t('recurring.next-run', {
                date: formatDayLabel(next, locale, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              })}`}
        </p>
      ) : null}
    </FormSection>
  )
}
