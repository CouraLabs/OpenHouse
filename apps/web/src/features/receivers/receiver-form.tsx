import { useDiscardGuard } from '@/lib/use-discard-guard.js'
import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateReceiverBody, Receiver, ReceiverType } from '@workspace/dto'
import { createReceiverSchema, receiverTypes } from '@workspace/dto'
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
    formState: { errors, isDirty },
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

  const guard = useDiscardGuard(isDirty)

  return (
    <FormSheet
      {...guard}
      title={receiver === null ? t('receivers.new') : t('receivers.edit-title')}
      submitLabel={isSaving ? t('receivers.saving') : t('receivers.save')}
      cancelLabel={t('receivers.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <div className="flex flex-col gap-4">
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
            <RequiredMark />
          </FieldLabel>
          <Select
            value={type}
            onValueChange={(value) =>
              setValue('type', value as ReceiverType, {
                shouldValidate: true,
                shouldDirty: true,
              })
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
    </FormSheet>
  )
}
