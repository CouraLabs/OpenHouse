import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { StartPage, UpdatePreferencesBody } from '@workspace/poco'
import { startPages, updatePreferencesSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { useSession } from '@/lib/auth.js'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { useSavePreferences } from './use-save-preferences.js'

export function PreferencesForm() {
  const { t } = useTranslation()
  const session = useSession()
  const save = useSavePreferences()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdatePreferencesBody>({
    resolver: zodResolver(updatePreferencesSchema),
    defaultValues: { startPage: session.data?.user.startPage ?? '/' },
  })

  const startPage = watch('startPage')
  const pageLabel = (page: StartPage) =>
    page === '/' ? t('settings.preferences.home') : t(`nav.${page.slice(1)}`)

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t('settings.preferences.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('settings.preferences.description')}
        </p>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-2">
        <Field data-invalid={errors.startPage !== undefined}>
          <FieldLabel htmlFor="preferences-start-page">
            {t('settings.preferences.start-page')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={startPage}
            onValueChange={(next) => {
              if (next !== null) {
                setValue('startPage', next as StartPage, {
                  shouldValidate: true,
                })
              }
            }}
          >
            <SelectTrigger id="preferences-start-page" className="w-full">
              {}
              <SelectValue>{pageLabel(startPage)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {startPages.map((page) => (
                <SelectItem key={page} value={page}>
                  {pageLabel(page)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            errors={
              errors.startPage !== undefined ? [errors.startPage] : undefined
            }
          />
        </Field>
      </div>
      {save.isError ? (
        <p className="text-sm text-destructive">
          {save.error instanceof Error
            ? save.error.message
            : t('settings.error')}
        </p>
      ) : null}
      {save.isSuccess ? (
        <p className="text-sm text-muted-foreground">{t('settings.saved')}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </form>
  )
}
