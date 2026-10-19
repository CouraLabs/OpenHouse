import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateLimitBody, Limit, LimitType } from '@workspace/poco'
import { createLimitSchema, limitTypes } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
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

/**
 * The fields the limit form holds. The rules come straight from the shared
 * poco schema — the same check the API runs, whose messages are already the
 * UX messages — so the form never re-declares them.
 */
const limitFormSchema = createLimitSchema

type LimitFormValues = z.infer<typeof limitFormSchema>

/** The props `LimitForm` takes. */
interface LimitFormProps {
  /** The limit being edited, or nothing while creating. */
  limit: Limit | null
  /** What a confirmed save should do; the dialog asks before this runs. */
  onSubmit: (body: CreateLimitBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/** The default values of a new limit: nothing chosen, nothing typed. */
const newLimit = (): LimitFormValues => ({
  categoryId: undefined as unknown as number,
  amount: '',
  type: 'Daily',
})

/**
 * The insert and edit form of the limits page: a category dropdown, the
 * period, and the amount with reverse input masking. A limit has no
 * currency of its own — it is in the tenant's main currency, which the
 * amount's label names. It renders above the table; the page decides when
 * it is open and what a submit saves.
 */
export function LimitForm({
  limit,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: LimitFormProps) {
  const { t, i18n } = useTranslation()
  const mainCurrency = useMainCurrency()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LimitFormValues>({
    resolver: zodResolver(limitFormSchema),
    // The page keys the form by the limit it edits, so switching rows
    // remounts it with that row's values.
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
  // The trigger's label is rendered here, not derived by base-ui from
  // `items`: a prefilled value set while the popup is closed would
  // otherwise fall back to the placeholder.
  const selectedCategory = (categories.data ?? []).find(
    (category) => category.id === categoryId
  )

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {limit === null ? t('limits.new') : t('limits.edit-title')}
      </p>
      {/* One row: what the cap is, and what it costs. */}
      <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">
        <Field data-invalid={errors.categoryId !== undefined}>
          <FieldLabel htmlFor="limit-category">
            {t('limits.category')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={categoryId}
            onValueChange={(value) =>
              setValue('categoryId', value as number, { shouldValidate: true })
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
              size="sm"
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
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={type}
            onValueChange={(value) =>
              setValue('type', value as LimitType, { shouldValidate: true })
            }
            items={limitTypes.map((value) => ({
              label: t(`limits.type-${value.toLowerCase()}`),
              value,
            }))}
          >
            <SelectTrigger
              id="limit-type"
              className="w-full"
              size="sm"
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
          locale={i18n.language}
          className="h-8"
          label={t('limits.amount-in', { currency: mainCurrency })}
          labelFor="limit-amount"
          placeholder={t('limits.amount-placeholder')}
          value={amount}
          onValueChange={(value) =>
            setValue('amount', value, { shouldValidate: true })
          }
          error={errors.amount}
          required
        />
      </div>
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('limits.saving') : t('limits.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          {t('limits.cancel')}
        </Button>
      </div>
    </form>
  )
}
