import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type {
  CreateReceiverBody,
  Receiver,
  ReceiverType,
} from '@workspace/poco'
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

const receiverFormSchema = createReceiverSchema

type ReceiverFormValues = z.infer<typeof receiverFormSchema>

interface ReceiverFormProps {
  receiver: Receiver | null
  onSubmit: (body: CreateReceiverBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

const NEW_RECEIVER: ReceiverFormValues = {
  name: '',
  type: undefined as unknown as ReceiverType,
}

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
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<ReceiverFormValues>({
    resolver: zodResolver(receiverFormSchema),
    defaultValues:
      receiver === null
        ? NEW_RECEIVER
        : {
            name: receiver.name,
            type: receiver.type,
          },
  })

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
          {}
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
