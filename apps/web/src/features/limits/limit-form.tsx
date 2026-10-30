import { useDiscardGuard } from '@/lib/use-discard-guard.js'
import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateLimitBody, Limit, LimitType } from '@workspace/poco'
import { createLimitSchema, limitTypes } from '@workspace/poco'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { useMainCurrency } from '@/lib/settings.js'
import { useActiveCategories } from './use-limits.js'
import { formattingLocale } from '@/lib/i18n.js'

const limitFormSchema = createLimitSchema

type LimitFormValues = z.infer<typeof limitFormSchema>

interface LimitFormProps {
  limit: Limit | null
  onSubmit: (body: CreateLimitBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

const newLimit = (): LimitFormValues => ({
  categoryId: undefined as unknown as number,
  amount: '',
  type: 'Daily',
})

export function LimitForm({
  limit,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: LimitFormProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<LimitFormValues>({
    resolver: zodResolver(limitFormSchema),
    defaultValues:
      limit === null
        ? newLimit()
        : {
            categoryId: limit.categoryId,
            amount: limit.amount,
            type: limit.type,
          },
  })

  const categoryId = watch('categoryId')
  const type = watch('type')
  const amount = watch('amount')
  const categories = useActiveCategories()
  const selectedCategory = (categories.data ?? []).find(
    (category) => category.id === categoryId
  )

  const guard = useDiscardGuard(isDirty)

  return (
    <FormSheet
      {...guard}
      title={limit === null ? t('limits.new') : t('limits.edit-title')}
      submitLabel={isSaving ? t('limits.saving') : t('limits.save')}
      cancelLabel={t('limits.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <div className="flex flex-col gap-4">
        <Field data-invalid={errors.categoryId !== undefined}>
          <FieldLabel htmlFor="limit-category">
            {t('limits.category')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={categoryId}
            onValueChange={(value) =>
              setValue('categoryId', value as number, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            items={(categories.data ?? []).map((category) => ({
              label: category.name,
              value: category.id,
            }))}
            disabled={categories.isPending}
          >
            <SelectTrigger
              id="limit-category"
              className="w-full"
              aria-invalid={errors.categoryId !== undefined}
            >
              <SelectValue placeholder={t('limits.category-placeholder')}>
                {selectedCategory?.name}
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
          <FieldError
            errors={
              errors.categoryId !== undefined ? [errors.categoryId] : undefined
            }
          />
        </Field>
        <Field data-invalid={errors.type !== undefined}>
          <FieldLabel htmlFor="limit-type">
            {t('limits.type')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={type}
            onValueChange={(value) =>
              setValue('type', value as LimitType, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            items={limitTypes.map((value) => ({
              label: t(`limits.type-${value.toLowerCase()}`),
              value,
            }))}
          >
            <SelectTrigger
              id="limit-type"
              className="w-full"
              aria-invalid={errors.type !== undefined}
            >
              <SelectValue placeholder={t('limits.type-placeholder')}>
                {type !== undefined
                  ? t(`limits.type-${type.toLowerCase()}`)
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {limitTypes.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`limits.type-${value.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            errors={errors.type !== undefined ? [errors.type] : undefined}
          />
        </Field>
        <MoneyField
          locale={formattingLocale()}
          currency={mainCurrency}

          label={t('limits.amount-in', { currency: mainCurrency })}
          labelFor="limit-amount"
          placeholder={t('limits.amount-placeholder')}
          value={amount}
          onValueChange={(value) =>
            setValue('amount', value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          error={errors.amount}
          required
        />
      </div>
    </FormSheet>
  )
}
