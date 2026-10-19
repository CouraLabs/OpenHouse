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

import { useActiveCategories, useActiveReceivers } from './use-linkers.js'

/**
 * The fields the linker form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const linkerFormSchema = createTransactionLinkerSchema

type LinkerFormValues = z.infer<typeof linkerFormSchema>

/** The props `LinkerForm` takes. */
interface LinkerFormProps {
  /** The linker being edited, or nothing while creating. */
  linker: TransactionLinker | null
  /** What a submit should do; the page decides where it saves. */
  onSubmit: (body: CreateTransactionLinkerBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/** The default values of a new linker: nothing chosen, nothing typed. */
const NEW_LINKER: LinkerFormValues = {
  description: '',
  categoryId: undefined as unknown as number,
  receiverId: undefined,
}

/**
 * The insert and edit form of the linkers page: a description, the
 * category the preset lands in, and an optional receiver. It renders above
 * the table; the page decides when it is open and what a submit saves.
 */
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
    // The page keys the form by the linker it edits, so switching rows
    // remounts it with that row's values.
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

  // The triggers' labels are rendered explicitly: a prefilled value set
  // while the popup is closed would otherwise fall back to the placeholder.
  const selectedCategory = (categories.data ?? []).find(
    (category) => category.id === categoryId
  )
  const selectedReceiver = (receivers.data ?? []).find(
    (receiver) => receiver.id === receiverId
  )

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {linker === null ? t('linkers.new') : t('linkers.edit-title')}
      </p>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
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
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
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
              // The Select's generic only admits strings; numbers work at
              // runtime, so the value crosses with a cast at the boundary.
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
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('linkers.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('linkers.saving') : t('linkers.save')}
        </Button>
      </div>
    </form>
  )
}
