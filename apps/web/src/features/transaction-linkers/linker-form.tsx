import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type {
  CreateTransactionLinkerBody,
  ReceiverRef,
  TransactionLinker,
} from '@workspace/poco'
import { createTransactionLinkerSchema } from '@workspace/poco'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TextField } from '@workspace/ui/components/text-field'

import { useActiveCategories, useActiveReceivers } from './use-linkers.js'

const linkerFormSchema = createTransactionLinkerSchema

type LinkerFormValues = z.infer<typeof linkerFormSchema>

interface LinkerFormProps {
  linker: TransactionLinker | null
  onSubmit: (body: CreateTransactionLinkerBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

const NEW_LINKER: LinkerFormValues = {
  description: '',
  categoryId: undefined as unknown as number,
  receiverId: undefined,
}

export function LinkerForm({
  linker,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: LinkerFormProps) {
  const { t } = useTranslation()
  const {
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<LinkerFormValues>({
    resolver: zodResolver(linkerFormSchema),
    defaultValues:
      linker === null
        ? NEW_LINKER
        : {
            description: linker.description,
            categoryId: linker.categoryId,
            receiverId: linker.receiverId ?? undefined,
          },
  })

  const categoryId = watch('categoryId')
  const receiverId = watch('receiverId')
  const categories = useActiveCategories()
  const receivers = useActiveReceivers()

  const selectedCategory = (categories.data ?? []).find(
    (category) => category.id === categoryId
  )
  const selectedReceiver = (receivers.data ?? []).find(
    (receiver) => receiver.id === receiverId
  )

  return (
    <FormSheet
      title={linker === null ? t('linkers.new') : t('linkers.edit-title')}
      submitLabel={isSaving ? t('linkers.saving') : t('linkers.save')}
      cancelLabel={t('linkers.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <div className="flex flex-col gap-4">
        <TextField
          type="text"
          label={t('linkers.description')}
          labelFor="linker-description"
          placeholder={t('linkers.description-placeholder')}
          required
          error={errors.description}
          {...register('description')}
        />
        <Field data-invalid={errors.categoryId !== undefined}>
          <FieldLabel htmlFor="linker-category">
            {t('linkers.category')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={categoryId}
            onValueChange={(value) =>
              setValue('categoryId', value as number, { shouldValidate: true })
            }
          >
            <SelectTrigger id="linker-category">
              <SelectValue>
                {selectedCategory === undefined
                  ? t('linkers.category-placeholder')
                  : selectedCategory.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId !== undefined ? (
            <FieldError>{errors.categoryId.message}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.receiverId !== undefined}>
          <FieldLabel htmlFor="linker-receiver">
            {t('linkers.receiver')}
          </FieldLabel>
          <Select
            value={receiverId}
            onValueChange={(rawValue) => {
              const chosen = rawValue as unknown as string

              setValue(
                'receiverId',
                chosen === 'none' ? undefined : Number(chosen),
                { shouldValidate: true }
              )
            }}
          >
            <SelectTrigger id="linker-receiver">
              <SelectValue>
                {selectedReceiver === undefined
                  ? t('linkers.receiver-placeholder')
                  : selectedReceiver.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t('linkers.receiver-placeholder')}
              </SelectItem>
              {(receivers.data ?? []).map((receiver: ReceiverRef) => (
                <SelectItem key={receiver.id} value={receiver.id}>
                  {receiver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.receiverId !== undefined ? (
            <FieldError>{errors.receiverId.message}</FieldError>
          ) : null}
        </Field>
      </div>
    </FormSheet>
  )
}
