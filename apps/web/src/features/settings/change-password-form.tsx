import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { changePasswordSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { TextField } from '@workspace/ui/components/text-field'

import { ApiError } from '@/lib/api.js'
import { useChangePassword } from '@/lib/auth.js'

const changePasswordFormSchema = changePasswordSchema
  .safeExtend({ confirmPassword: z.string() })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>

export function ChangePasswordForm() {
  const { t } = useTranslation()
  const change = useChangePassword()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      reset()
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setError('currentPassword', { message: error.message })
      }
    }
  })

  const generalError =
    change.isError &&
    !(change.error instanceof ApiError && change.error.status === 400)
      ? change.error instanceof Error
        ? change.error.message
        : t('settings.error')
      : undefined

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t('settings.security.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('settings.security.description')}
        </p>
      </div>
      <div className="grid max-w-md gap-3">
        <TextField
          type="password"
          labelFor="settings-current-password"
          label={t('settings.security.current-password')}
          autoComplete="current-password"
          required
          error={errors.currentPassword}
          {...register('currentPassword')}
        />
        <TextField
          type="password"
          labelFor="settings-new-password"
          label={t('settings.security.new-password')}
          placeholder={t('settings.security.new-password-placeholder')}
          autoComplete="new-password"
          required
          error={errors.newPassword}
          {...register('newPassword')}
        />
        <TextField
          type="password"
          labelFor="settings-confirm-password"
          label={t('settings.security.confirm-password')}
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />
      </div>
      {generalError !== undefined ? (
        <p className="text-sm text-destructive">{generalError}</p>
      ) : null}
      {change.isSuccess ? (
        <p className="text-sm text-muted-foreground">
          {t('settings.security.changed')}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={change.isPending}>
          {change.isPending
            ? t('settings.security.changing')
            : t('settings.security.change')}
        </Button>
      </div>
    </form>
  )
}
