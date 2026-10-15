import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateReceiverBody, Receiver, ReceiverType } from '@workspace/poco'
import { createReceiverSchema, receiverTypes } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TextField } from '@workspace/ui/components/text-field'

/**
 * The fields the receiver form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const receiverFormSchema = createReceiverSchema

type ReceiverFormValues = z.infer<typeof receiverFormSchema>

/** The props `ReceiverForm` takes. */
interface ReceiverFormProps {
  /** The receiver being edited, or nothing while creating. */
  receiver: Receiver | null
  /** What a submit should do; the page decides where it saves. */
  onSubmit: (body: CreateReceiverBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/** The default values of a new receiver: nothing chosen, nothing typed. */
const NEW_RECEIVER: ReceiverFormValues = {
  name: '',
  type: undefined as unknown as ReceiverType,
}

/**
 * The insert and edit form of the receivers page: a name and the kind of
 * receiver. It renders above the table; the page decides when it is open
 * and what a submit saves.
 */
export function ReceiverForm({
  receiver,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: ReceiverFormProps) {
  const { t } = useTranslation()
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<ReceiverFormValues>({
    resolver: zodResolver(receiverFormSchema),
    defaultValues: NEW_RECEIVER,
  })

  // The form holds the receiver it edits: switching rows resets the fields.
  useEffect(() => {
    reset(
      receiver === null
        ? NEW_RECEIVER
        : {
            name: receiver.name,
            type: receiver.type,
          }
    )
  }, [receiver, reset])

  const type = watch('type')

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {receiver === null ? t('receivers.new') : t('receivers.edit-title')}
      </p>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        <TextField
          type="text"
          label={t('receivers.name')}
          labelFor="receiver-name"
          placeholder={t('receivers.name-placeholder')}
          required
          error={errors.name}
          {...register('name')}
        />
        <Field data-invalid={errors.type !== undefined}>
          <FieldLabel htmlFor="receiver-type">
            {t('receivers.type')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          {/* The trigger's label is rendered explicitly: a prefilled value
           * set while the popup is closed would otherwise fall back to the
           * placeholder. */}
          <Select
            value={type}
            onValueChange={(value) =>
              setValue('type', value as ReceiverType, { shouldValidate: true })
            }
          >
            <SelectTrigger id="receiver-type">
              <SelectValue>
                {type === undefined
                  ? t('receivers.type-placeholder')
                  : t(`receivers.type-${type.toLowerCase()}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {receiverTypes.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`receivers.type-${value.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type !== undefined ? (
            <FieldError>{errors.type.message}</FieldError>
          ) : null}
        </Field>
      </div>
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('receivers.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('receivers.saving') : t('receivers.save')}
        </Button>
      </div>
    </form>
  )
}
