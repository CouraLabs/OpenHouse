import { useDiscardGuard } from '@/lib/use-discard-guard.js'
import { FormSheet } from '@workspace/ui/components/form-sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { Category, CreateCategoryBody } from '@workspace/poco'
import { createCategorySchema } from '@workspace/poco'
import { ColorField } from '@workspace/ui/components/color-field'
import { TextField } from '@workspace/ui/components/text-field'

import { SplitSection } from '@/components/split-section.js'
import { useMainCurrency } from '@/lib/settings.js'

const categoryFormSchema = createCategorySchema

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryFormProps {
  category: Category | null
  onSubmit: (body: CreateCategoryBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

export function CategoryForm({
  category,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: CategoryFormProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues:
      category === null
        ? { name: '', color: '#1D4ED8', defaultSplit: null }
        : {
            name: category.name,
            color: category.color,
            defaultSplit: category.defaultSplit,
          },
  })

  const color = watch('color')
  const defaultSplit = watch('defaultSplit') ?? null

  const guard = useDiscardGuard(isDirty)

  return (
    <FormSheet
      {...guard}
      title={
        category === null ? t('categories.new') : t('categories.edit-title')
      }
      submitLabel={isSaving ? t('categories.saving') : t('categories.save')}
      cancelLabel={t('categories.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <div className="flex flex-col gap-4">
        <TextField
          type="text"

          label={t('categories.name')}
          labelFor="category-name"
          placeholder={t('categories.name-placeholder')}
          required
          error={errors.name}
          {...register('name')}
        />
        <ColorField
          label={t('categories.color')}
          labelFor="category-color"
          value={color}
          onChange={(hex) =>
            setValue('color', hex, { shouldValidate: true, shouldDirty: true })
          }
          error={errors.color}
          required
        />
      </div>
      <SplitSection
        idPrefix="category-split"
        value={defaultSplit}
        onChange={(next) =>
          setValue('defaultSplit', next, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
        currency={mainCurrency}
        payerUserId={null}
        allowExact={false}
      />
    </FormSheet>
  )
}
