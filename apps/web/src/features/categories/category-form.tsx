import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { Category, CreateCategoryBody } from '@workspace/poco'
import { createCategorySchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { ColorField } from '@workspace/ui/components/color-field'
import { TextField } from '@workspace/ui/components/text-field'

/**
 * The fields the category form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const categoryFormSchema = createCategorySchema

type CategoryFormValues = z.infer<typeof categoryFormSchema>

/** The props `CategoryForm` takes. */
interface CategoryFormProps {
  /** The category being edited, or nothing while creating. */
  category: Category | null
  /** What a confirmed save should do; the dialog asks before this runs. */
  onSubmit: (body: CreateCategoryBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/**
 * The insert and edit form of the categories page: a name, a color, and the
 * buttons. It renders above the table; the page decides when it is open and
 * what a submit saves.
 */
export function CategoryForm({
  category,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: CategoryFormProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    // The page keys the form by the category it edits, so switching rows
    // remounts it with that row's values.
    defaultValues:
      category === null
        ? { name: '', color: '#1D4ED8' }
        : { name: category.name, color: category.color },
  })

  const color = watch('color')

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {category === null ? t('categories.new') : t('categories.edit-title')}
      </p>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <TextField
          type="text"
          className="h-8"
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
          onChange={(hex) => setValue('color', hex, { shouldValidate: true })}
          error={errors.color}
          required
        />
      </div>
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('categories.saving') : t('categories.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          {t('categories.cancel')}
        </Button>
      </div>
    </form>
  )
}
