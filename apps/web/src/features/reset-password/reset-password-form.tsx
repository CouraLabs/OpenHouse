import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { resetPasswordSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { TextField } from '@workspace/ui/components/text-field'

import { ApiError } from '@/lib/api.js'
import { useResetPassword } from '@/lib/auth.js'

interface ResetPasswordFormProps {
  initialCode?: string
  onSuccess: () => void
}

export function ResetPasswordForm({
  initialCode = '',
  onSuccess,
}: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const reset = useResetPassword()
  const formSchema = resetPasswordSchema
    .extend({
      code: z.string().trim().min(1, t('reset-password.code-required')),
      confirmPassword: z.string(),
    })
    .refine((values) => values.confirmPassword === values.newPassword, {
      path: ['confirmPassword'],
      message: t('reset-password.mismatch'),
    })
  type FormValues = z.infer<typeof formSchema>

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialCode,
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reset.mutateAsync({
        code: values.code,
        newPassword: values.newPassword,
      })
      onSuccess()
    } catch (error) {
      setError('code', {
        message:
          error instanceof ApiError ? error.message : t('settings.error'),
      })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        type="text"
        label={t('reset-password.code')}
        labelFor="reset-code"
        placeholder="XXXXX-XXXXX"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        className="font-mono"
        required
        error={errors.code}
        {...register('code')}
      />
      <TextField
        type="password"
        label={t('reset-password.new-password')}
        labelFor="reset-new-password"
        placeholder={t('settings.security.new-password-placeholder')}
        autoComplete="new-password"
        required
        error={errors.newPassword}
        {...register('newPassword')}
      />
      <TextField
        type="password"
        label={t('reset-password.confirm-password')}
        labelFor="reset-confirm-password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
        {...register('confirmPassword')}
      />
      <Button type="submit" disabled={reset.isPending}>
        {reset.isPending
          ? t('reset-password.submitting')
          : t('reset-password.submit')}
      </Button>
    </form>
  )
}
