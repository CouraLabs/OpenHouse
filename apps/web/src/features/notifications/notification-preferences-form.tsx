import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { MAX_LEAD_DAYS, notificationPreferencesSchema, reminderDeliveries, type NotificationPreferences, type ReminderDelivery } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { NumberField } from '@workspace/ui/components/number-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { CalendarFeedSection } from './calendar-feed-section.js'
import { PushToggle } from './push-toggle.js'
import { SwitchField } from './switch-field.js'
import { useSaveNotificationPreferences } from './use-notifications.js'

export function NotificationPreferencesForm({
  initial,
  onSaved,
}: {
  initial: NotificationPreferences
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const save = useSaveNotificationPreferences()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: initial,
  })
  const values = watch()

  const toggle = (name: keyof NotificationPreferences) => (checked: boolean) =>
    setValue(name, checked as never, { shouldDirty: true })
  const days = (name: 'billLeadDays' | 'recurringLeadDays') => (raw: string) =>
    setValue(name, raw === '' ? Number.NaN : Number(raw), {
      shouldValidate: true,
      shouldDirty: true,
    })

  return (
    <form
      onSubmit={handleSubmit((body) =>
        save.mutate(body, { onSuccess: onSaved })
      )}
      className="flex flex-col gap-6"
      noValidate
    >
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t('notifications.channels')}</h3>
        <SwitchField
          id="prefs-in-app"
          label={t('notifications.in-app')}
          description={t('notifications.in-app-help')}
          checked={values.inAppEnabled}
          onCheckedChange={toggle('inAppEnabled')}
        />
        <SwitchField
          id="prefs-push"
          label={t('notifications.push')}
          description={t('notifications.push-help')}
          checked={values.pushEnabled}
          onCheckedChange={toggle('pushEnabled')}
        />
        <SwitchField
          id="prefs-push-details"
          label={t('notifications.push-details')}
          description={t('notifications.push-details-help')}
          checked={values.pushDetails}
          disabled={!values.pushEnabled}
          onCheckedChange={toggle('pushDetails')}
        />
        <PushToggle />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t('notifications.lead')}</h3>
        <div className="flex flex-col gap-3">
          <NumberField
            label={t('notifications.bill-lead')}
            labelFor="prefs-bill-lead"
            value={
              Number.isNaN(values.billLeadDays)
                ? ''
                : String(values.billLeadDays)
            }
            onValueChange={days('billLeadDays')}
            error={errors.billLeadDays}
            inputMode="numeric"
            maxLength={String(MAX_LEAD_DAYS).length}
          />
          <NumberField
            label={t('notifications.recurring-lead')}
            labelFor="prefs-recurring-lead"
            value={
              Number.isNaN(values.recurringLeadDays)
                ? ''
                : String(values.recurringLeadDays)
            }
            onValueChange={days('recurringLeadDays')}
            error={errors.recurringLeadDays}
            inputMode="numeric"
            maxLength={String(MAX_LEAD_DAYS).length}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t('notifications.limits')}</h3>
        <SwitchField
          id="prefs-limit-80"
          label={t('notifications.limit-alert-80')}
          checked={values.limitAlert80}
          onCheckedChange={toggle('limitAlert80')}
        />
        <SwitchField
          id="prefs-limit-100"
          label={t('notifications.limit-alert-100')}
          checked={values.limitAlert100}
          onCheckedChange={toggle('limitAlert100')}
        />
      </section>

      <Field data-invalid={errors.delivery !== undefined}>
        <FieldLabel htmlFor="prefs-delivery">
          {t('notifications.delivery')}
        </FieldLabel>
        <Select
          value={values.delivery}
          onValueChange={(next) => {
            if (next !== null) {
              setValue('delivery', next as ReminderDelivery, {
                shouldDirty: true,
              })
            }
          }}
        >
          <SelectTrigger id="prefs-delivery" className="w-full">
            <SelectValue>
              {t(`notifications.delivery-${values.delivery}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {reminderDeliveries.map((delivery) => (
              <SelectItem key={delivery} value={delivery}>
                {t(`notifications.delivery-${delivery}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError
          errors={errors.delivery !== undefined ? [errors.delivery] : undefined}
        />
      </Field>

      <CalendarFeedSection />

      {save.isError ? (
        <p className="text-sm text-destructive">
          {save.error instanceof Error
            ? save.error.message
            : t('notifications.save-error')}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </form>
  )
}
